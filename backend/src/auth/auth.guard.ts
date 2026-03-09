import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth-request.interface';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const payload = await this.authService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    request.authUser = payload;
    return true;
  }

  private extractToken(authorization?: string): string | null {
    if (!authorization?.startsWith('Bearer ')) return null;
    return authorization.slice(7);
  }
}