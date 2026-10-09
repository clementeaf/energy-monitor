import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { JwtPayload } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { resolvePublicViewer } from './public-viewer';

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

    const publicViewer = resolvePublicViewer(request, process.env.PUBLIC_READ_ONLY_TENANT_ID);
    if (!publicViewer) return super.canActivate(context);
    return this.authenticateOrServePublicViewer(context, request, publicViewer);
  }

  private async authenticateOrServePublicViewer(
    context: ExecutionContext,
    request: Request & { user?: JwtPayload },
    publicViewer: JwtPayload,
  ): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
      request.user = publicViewer;
      return true;
    }
  }
}
