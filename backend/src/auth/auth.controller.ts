import { Controller, Get, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { MeResponseDto, PermissionsResponseDto } from './dto/auth-response.dto';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener usuario autenticado', description: 'Verifica el JWT (Microsoft/Google) y retorna el usuario con sus permisos.' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Cuenta deshabilitada' })
  async getMe(@Req() req: Request) {
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing Authorization header');

    const payload = await this.authService.verifyToken(token);
    if (!payload) throw new UnauthorizedException('Invalid token');

    const result = await this.authService.resolveUser(payload);
    if (!result) throw new ForbiddenException('User account is disabled');

    return result;
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Obtener permisos del usuario', description: 'Retorna el rol y mapa de permisos del usuario autenticado.' })
  @ApiOkResponse({ type: PermissionsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Usuario no encontrado o deshabilitado' })
  async getPermissions(@Req() req: Request) {
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing Authorization header');

    const payload = await this.authService.verifyToken(token);
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
