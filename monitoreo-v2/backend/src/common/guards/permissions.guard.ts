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
