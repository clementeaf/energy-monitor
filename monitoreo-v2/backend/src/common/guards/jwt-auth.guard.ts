import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/** Key set on request by ApiKeyGuard when API key auth succeeds. */
export const API_KEY_AUTH_FLAG = '_apiKeyAuth';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // If ApiKeyGuard already authenticated this request, skip JWT validation
    const request = context.switchToHttp().getRequest();
    if (request[API_KEY_AUTH_FLAG]) return true;

    return super.canActivate(context);
  }
}
