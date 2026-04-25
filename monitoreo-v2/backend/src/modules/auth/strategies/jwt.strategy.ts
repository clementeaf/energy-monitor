import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. httpOnly cookie — __Host- prefix in production, plain in dev
        (req: Request) =>
          req?.cookies?.['__Host-access_token'] ??
          req?.cookies?.['access_token'] ??
          null,
        // 2. Bearer header (API external clients)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Strict validation of JWT payload structure.
   * Rejects malformed tokens even if signature is valid — defense-in-depth.
   */
  validate(payload: Record<string, unknown>): JwtPayload {
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

    return {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      roleSlug: payload.roleSlug as string,
      permissions: payload.permissions as string[],
      buildingIds: (buildingIds as string[]) ?? [],
      crossTenant: false,
    };
  }
}
