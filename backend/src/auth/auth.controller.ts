import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthService, type TokenPayload } from './auth.service';
import { MeResponseDto, PermissionsResponseDto } from './dto/auth-response.dto';
import { CurrentUser } from './current-user.decorator';

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
  async getMe(@CurrentUser() payload: TokenPayload) {
    const result = await this.authService.resolveUser(payload);
    if (!result) throw new ForbiddenException('User account is disabled');

    return result;
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Obtener permisos del usuario', description: 'Retorna el rol y mapa de permisos del usuario autenticado.' })
  @ApiOkResponse({ type: PermissionsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Usuario no encontrado o deshabilitado' })
  async getPermissions(@CurrentUser() payload: TokenPayload) {
    const result = await this.authService.resolvePermissions(payload);
    if (!result) throw new ForbiddenException('User not found or disabled');

    return result;
  }
}
