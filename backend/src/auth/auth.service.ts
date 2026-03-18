import { Injectable, Logger } from '@nestjs/common';
import { decodeJwt, createRemoteJWKSet, jwtVerify } from 'jose';
import { UsersService } from '../users/users.service';
import { RolesService, isGlobalSiteAccessRole } from '../roles/roles.service';
import { SessionService } from '../session/session.service';
import type { AccessScope } from './access-scope';

export const SESSION_ISSUER = 'energy-monitor/session';

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  iss: string;
}

export interface AuthorizationContext extends AccessScope {
  userId: string;
  roleId: number;
  role: string;
  provider: 'microsoft' | 'google' | 'session';
  email: string;
  name: string;
  avatar?: string;
  userMode: string;
  permissions: Record<string, string[]>;
}

const MICROSOFT_JWKS_URL = 'https://login.microsoftonline.com/common/discovery/v2.0/keys';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_ISSUER = 'accounts.google.com';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly sessionService: SessionService,
  ) {}

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      // Decode header to detect provider before verification
      const claims = decodeJwt(token);

      if (!claims.iss) return null;
      const provider = this.detectProvider(claims.iss);
      if (!provider) return null;

      const jwksUrl = provider === 'microsoft' ? MICROSOFT_JWKS_URL : GOOGLE_JWKS_URL;
      const jwks = createRemoteJWKSet(new URL(jwksUrl));

      const audience =
        provider === 'google'
          ? process.env.GOOGLE_CLIENT_ID
          : process.env.MICROSOFT_CLIENT_ID;

      if (!audience) {
        this.logger.warn(`Missing ${provider.toUpperCase()}_CLIENT_ID env var`);
        return null;
      }

      const verifyOptions = {
        algorithms: ['RS256'],
        audience,
      };

      const { payload } = await jwtVerify(token, jwks, verifyOptions);

      if (!payload.sub) return null;

      // Microsoft Entra may omit "email"; use preferred_username or upn so user lookup by email works.
      const email =
        (payload.email as string | undefined) ??
        (payload.preferred_username as string | undefined) ??
        (payload.upn as string | undefined);
      if (!email) return null;

      return {
        sub: payload.sub,
        email,
        name: ((payload.name ?? payload.email ?? email) as string),
        picture: payload.picture as string | undefined,
        iss: payload.iss!,
      };
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${(err as Error).message}`);
    }

    // Fallback: Google access_token (opaque) — verify via userinfo API
    const googleUser = await this.verifyGoogleAccessToken(token);
    if (googleUser) return googleUser;

    const session = await this.sessionService.findByTokenHash(
      this.sessionService.hashToken(token),
    );
    if (session?.user) {
      return {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        iss: SESSION_ISSUER,
      };
    }
    return null;
  }

  /**
   * Verify a Google access_token (opaque) by calling Google's userinfo endpoint.
   * Used when the frontend uses the popup/implicit OAuth flow instead of the credential (JWT) flow.
   */
  private async verifyGoogleAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      const res = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;

      const data = await res.json() as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      };

      if (!data.sub || !data.email) return null;

      return {
        sub: data.sub,
        email: data.email,
        name: data.name ?? data.email,
        picture: data.picture,
        iss: GOOGLE_ISSUER,
      };
    } catch {
      return null;
    }
  }

  detectProvider(issuer: string): 'microsoft' | 'google' | null {
    if (issuer.includes('microsoftonline.com')) return 'microsoft';
    if (issuer.includes('accounts.google.com')) return 'google';
    return null;
  }

  async resolveAuthorizationContext(
    payload: TokenPayload,
  ): Promise<AuthorizationContext | null> {
    if (payload.iss === SESSION_ISSUER) {
      const user = await this.usersService.findById(payload.sub);
      if (!user?.isActive) return null;
      const [permissions, siteIds] = await Promise.all([
        this.rolesService.getPermissionsByRoleId(user.roleId),
        this.usersService.getSiteIds(user.id),
      ]);
      const hasGlobalSiteAccess = isGlobalSiteAccessRole(user.role.name);
      return {
        userId: user.id,
        roleId: user.roleId,
        role: user.role.name,
        provider: 'session',
        email: user.email,
        name: user.name,
        avatar: user.avatarUrl ?? undefined,
        userMode: user.userMode,
        siteIds,
        hasGlobalSiteAccess,
        permissions,
      };
    }

    const provider = this.detectProvider(payload.iss);
    if (!provider) return null;

    const user = await this.usersService.findByExternalId(provider, payload.sub);
    if (!user?.isActive) return null;

    const [permissions, siteIds] = await Promise.all([
      this.rolesService.getPermissionsByRoleId(user.roleId),
      this.usersService.getSiteIds(user.id),
    ]);
    const hasGlobalSiteAccess = isGlobalSiteAccessRole(user.role.name);

    return {
      userId: user.id,
      roleId: user.roleId,
      role: user.role.name,
      provider,
      email: user.email,
      name: user.name,
      avatar: user.avatarUrl ?? undefined,
      userMode: user.userMode,
      siteIds,
      hasGlobalSiteAccess,
      permissions,
    };
  }

  async resolveUser(payload: TokenPayload, invitationToken?: string) {
    if (payload.iss === SESSION_ISSUER) {
      const authContext = await this.resolveAuthorizationContext(payload);
      if (!authContext) return null;
      return {
        user: {
          id: authContext.userId,
          email: authContext.email,
          name: authContext.name,
          role: authContext.role,
          provider: authContext.provider,
          avatar: authContext.avatar,
          userMode: authContext.userMode,
          siteIds: authContext.hasGlobalSiteAccess ? ['*'] : authContext.siteIds,
        },
        permissions: authContext.permissions,
      };
    }

    const provider = this.detectProvider(payload.iss);
    if (!provider) return null;

    const user = await this.usersService.bindIdentityFromLogin({
      externalId: payload.sub,
      provider,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
      invitationToken,
    });

    if (!user) return null;

    const authContext = await this.resolveAuthorizationContext(payload);
    if (!authContext) return null;

    return {
      user: {
        id: authContext.userId,
        email: authContext.email,
        name: authContext.name,
        role: authContext.role,
        provider: authContext.provider,
        avatar: authContext.avatar,
        siteIds: authContext.hasGlobalSiteAccess ? ['*'] : authContext.siteIds,
      },
      permissions: authContext.permissions,
    };
  }

  async resolvePermissions(payload: TokenPayload) {
    const authContext = await this.resolveAuthorizationContext(payload);
    if (!authContext) return null;

    return {
      role: authContext.role,
      permissions: authContext.permissions,
    };
  }
}
