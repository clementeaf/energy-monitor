import { Controller, Get, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  async getMe(@Req() req: Request) {
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing Authorization header');

    const payload = this.authService.decodeToken(token);
    if (!payload) throw new UnauthorizedException('Invalid token');

    const result = await this.authService.resolveUser(payload);
    if (!result) throw new ForbiddenException('User account is disabled');

    return result;
  }

  @Get('permissions')
  async getPermissions(@Req() req: Request) {
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing Authorization header');

    const payload = this.authService.decodeToken(token);
    if (!payload) throw new UnauthorizedException('Invalid token');

    const result = await this.authService.resolvePermissions(payload);
    if (!result) throw new ForbiddenException('User not found or disabled');

    return result;
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
