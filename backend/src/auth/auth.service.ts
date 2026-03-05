import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  iss: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (!payload.sub || !payload.email) return null;
      return payload;
    } catch {
      return null;
    }
  }

  detectProvider(issuer: string): 'microsoft' | 'google' | null {
    if (issuer.includes('microsoftonline.com')) return 'microsoft';
    if (issuer.includes('accounts.google.com')) return 'google';
    return null;
  }

  async resolveUser(payload: TokenPayload) {
    const provider = this.detectProvider(payload.iss);
    if (!provider) return null;

    await this.usersService.upsert({
      externalId: payload.sub,
      provider,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    });

    const user = await this.usersService.findByExternalId(provider, payload.sub);
    if (!user || !user.isActive) return null;

    const permissions = await this.rolesService.getPermissionsByRoleId(user.roleId);
    const siteIds = await this.usersService.getSiteIds(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        provider,
        avatar: user.avatarUrl,
        siteIds: siteIds.length > 0 ? siteIds : ['*'],
      },
      permissions,
    };
  }

  async resolvePermissions(payload: TokenPayload) {
    const provider = this.detectProvider(payload.iss);
    if (!provider) return null;

    const user = await this.usersService.findByExternalId(provider, payload.sub);
    if (!user || !user.isActive) return null;

    const permissions = await this.rolesService.getPermissionsByRoleId(user.roleId);
    return { role: user.role.name, permissions };
  }
}
