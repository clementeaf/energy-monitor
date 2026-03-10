import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { RoleResponseDto } from './dto/role-response.dto';
import { isGlobalSiteAccessRole, RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({ summary: 'Listar roles activos', description: 'Retorna el catálogo de roles disponible para provisionar usuarios e invitaciones.' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Permiso ADMIN_USERS.view requerido' })
  async findAll() {
    const roles = await this.rolesService.findAll();

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      labelEs: role.labelEs,
      requiresSiteScope: !isGlobalSiteAccessRole(role.name),
    }));
  }
}