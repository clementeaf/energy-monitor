import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth-request.interface';
import { AuthService } from './auth.service';
import { applySelectedSiteContext } from './access-scope';
import {
  REQUIRED_PERMISSION_KEY,
  type RequiredPermission,
} from './require-permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authUser) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const authContext =
      request.authContext ??
      (await this.authService.resolveAuthorizationContext(request.authUser));

    if (!authContext) {
      throw new ForbiddenException('User not found or disabled');
    }

    const selectedSiteHeader = request.headers['x-site-context'];
    const selectedSiteId = Array.isArray(selectedSiteHeader) ? selectedSiteHeader[0] : selectedSiteHeader;
    const effectiveAuthContext = applySelectedSiteContext(authContext, selectedSiteId);
    if (!effectiveAuthContext) {
      throw new ForbiddenException('Selected site is outside user scope');
    }

    request.authContext = effectiveAuthContext;

    const allowedActions = effectiveAuthContext.permissions[requiredPermission.module] ?? [];
    if (!allowedActions.includes(requiredPermission.action)) {
      throw new ForbiddenException(
        `Missing permission ${requiredPermission.module}.${requiredPermission.action}`,
      );
    }

    return true;
  }
}