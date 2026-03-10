import { Injectable, Logger } from '@nestjs/common';
import { decodeJwt, createRemoteJWKSet, jwtVerify } from 'jose';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  iss: string;
}

export interface AuthorizationContext {
  userId: string;
  roleId: number;
  role: string;
  provider: 'microsoft' | 'google';
  email: string;
  name: string;
  avatar?: string;
  permissions: Record<string, string[]>;
}

const MICROSOFT_JWKS_URL = 'https://login.microsoftonline.com/common/discovery/v2.0/keys';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
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

      if (!payload.sub || !payload.email) return null;

      return {
        sub: payload.sub,
        email: payload.email as string,
        name: ((payload.name ?? payload.email) as string),
        picture: payload.picture as string | undefined,
        iss: payload.iss!,
      };
    } catch (err) {
      this.logger.warn(`Token verification failed: ${(err as Error).message}`);
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
    const provider = this.detectProvider(payload.iss);
    if (!provider) return null;

    const user = await this.usersService.findByExternalId(provider, payload.sub);
    if (!user?.isActive) return null;

    const permissions = await this.rolesService.getPermissionsByRoleId(user.roleId);

    return {
      userId: user.id,
      roleId: user.roleId,
      role: user.role.name,
      provider,
      email: user.email,
      name: user.name,
      avatar: user.avatarUrl ?? undefined,
      permissions,
    };
  }

  async resolveUser(payload: TokenPayload) {
    const provider = this.detectProvider(payload.iss);
    if (!provider) return null;

    const user = await this.usersService.bindIdentityFromLogin({
      externalId: payload.sub,
      provider,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    });

    if (!user) return null;

    const authContext = await this.resolveAuthorizationContext(payload);
    if (!authContext) return null;

    const siteIds = await this.usersService.getSiteIds(authContext.userId);

    return {
      user: {
        id: authContext.userId,
        email: authContext.email,
        name: authContext.name,
        role: authContext.role,
        provider: authContext.provider,
        avatar: authContext.avatar,
        siteIds: siteIds.length > 0 ? siteIds : ['*'],
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
