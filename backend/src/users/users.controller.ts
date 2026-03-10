import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { UsersService } from './users.service';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { CreateUserInvitationDto } from './dto/create-user-invitation.dto';
import { CreateUserInvitationResponseDto } from './dto/create-user-invitation-response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({ summary: 'Listar usuarios e invitaciones', description: 'Retorna los usuarios provisionados y las invitaciones pendientes con su rol y sitios asignados.' })
  @ApiOkResponse({ type: AdminUserResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Permiso ADMIN_USERS.view requerido' })
  listUsers() {
    return this.usersService.listAdminUsers();
  }

  @Post()
  @RequirePermissions('ADMIN_USERS', 'manage')
  @ApiOperation({ summary: 'Crear invitación de acceso', description: 'Provisiona un usuario invitado con rol y sitios preasignados para que su primer login resuelva vistas y acciones automáticamente.' })
  @ApiBody({ type: CreateUserInvitationDto })
  @ApiCreatedResponse({ type: CreateUserInvitationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Permiso ADMIN_USERS.manage requerido' })
  @ApiConflictResponse({ description: 'Ya existe un registro de acceso para ese email' })
  createInvitation(@Body() dto: CreateUserInvitationDto) {
    return this.usersService.createInvitation(dto);
  }
}