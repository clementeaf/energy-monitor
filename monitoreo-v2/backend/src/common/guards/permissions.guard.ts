import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

// Re-export decorators for backward compatibility
export { RequirePermission, RequireAnyPermission, PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest().user as JwtPayload;

    // super_admin bypasses all permission checks
    if (user?.roleSlug === 'super_admin') return true;

    if (!user?.permissions?.length) {
      throw new ForbiddenException('No permissions found');
    }

    const userPerms = new Set(user.permissions);
    const hasPermission = required.some((p) => userPerms.has(p));

    if (!hasPermission) {
      throw new ForbiddenException(`Missing permission: ${required.join(' | ')}`);
    }

    // ISO 27001: prevent cross-tenant access from parameter tampering
    // If the route or query has a tenantId, verify it matches the JWT tenant
    if (user.roleSlug !== 'super_admin') {
      const request = context.switchToHttp().getRequest();
      const paramTenant = request.params?.tenantId ?? request.query?.tenantId ?? request.body?.tenantId;
      if (paramTenant && paramTenant !== user.tenantId) {
        throw new ForbiddenException('Cross-tenant access denied');
      }
    }

    return true;
  }
}
