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
import { RolesService } from './roles.service';
import { ViewResponseDto } from './dto/view-response.dto';

@ApiTags('Views')
@ApiBearerAuth()
@Controller('views')
export class ViewsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('CONTEXT_SELECT', 'view')
  @ApiOperation({ summary: 'Listar catálogo de vistas', description: 'Retorna el catálogo persistido de vistas/rutas reales del producto con su metadata de navegación.' })
  @ApiOkResponse({ type: ViewResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Permiso CONTEXT_SELECT.view requerido' })
  findAll() {
    return this.rolesService.findAllViews();
  }
}