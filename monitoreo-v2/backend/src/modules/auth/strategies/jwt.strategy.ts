import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { jwtAccessTokenExtractors } from './jwt-extractors';
import { JwtBlacklistService } from '../jwt-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly blacklist: JwtBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors(jwtAccessTokenExtractors),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Strict validation of JWT payload structure.
   * Rejects malformed tokens even if signature is valid — defense-in-depth.
   * Also checks JWT blacklist (logout / password change).
   */
  async validate(payload: Record<string, unknown>): Promise<JwtPayload> {
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.tenantId !== 'string' ||
      typeof payload.roleId !== 'string' ||
      typeof payload.roleSlug !== 'string' ||
      !Array.isArray(payload.permissions) ||
      !payload.permissions.every((p: unknown) => typeof p === 'string')
    ) {
      throw new UnauthorizedException('Malformed token payload');
    }

    const buildingIds = payload.buildingIds;
    if (
      buildingIds !== undefined &&
      (!Array.isArray(buildingIds) || !buildingIds.every((b: unknown) => typeof b === 'string'))
    ) {
      throw new UnauthorizedException('Malformed token payload');
    }

    const sub = payload.sub as string;
    const iat = typeof payload.iat === 'number' ? payload.iat : 0;

    // Check user-level blacklist (logout / password change)
    if (await this.blacklist.isUserBlacklisted(sub, iat)) {
      throw new UnauthorizedException('Token revoked');
    }

    return {
      sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      roleSlug: payload.roleSlug as string,
      permissions: payload.permissions as string[],
      buildingIds: (buildingIds as string[]) ?? [],
      crossTenant: false,
      iat,
    };
  }
}
