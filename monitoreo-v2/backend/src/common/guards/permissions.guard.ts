import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Require a single permission: @RequirePermission('billing', 'create')
 * Stored in JWT as "billing:create" — guard does a Set.has() lookup.
 */
export const RequirePermission = (module: string, action: string) =>
  SetMetadata(PERMISSIONS_KEY, [`${module}:${action}`]);

/**
 * Require ANY of the listed permissions: @RequireAnyPermission('billing:read', 'billing:view_own')
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

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
    if (!user?.permissions?.length) {
      throw new ForbiddenException('No permissions found');
    }

    const userPerms = new Set(user.permissions);
    const hasPermission = required.some((p) => userPerms.has(p));

    if (!hasPermission) {
      throw new ForbiddenException(`Missing permission: ${required.join(' | ')}`);
    }

    return true;
  }
}
