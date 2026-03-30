import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../decorators/current-user.decorator';

export const ROLES_KEY = 'roles';

/**
 * @deprecated Use PermissionsGuard + @RequirePermission() instead.
 * Kept for backward compatibility during migration.
 * Checks user.roleSlug against allowed role slugs.
 */
export const Roles = (...roles: string[]) =>
  Reflect.metadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    if (!user || !requiredRoles.includes(user.roleSlug)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
