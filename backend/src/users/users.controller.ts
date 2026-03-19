import { Body, Controller, Delete, Get, Headers, NotFoundException, Param, Post } from '@nestjs/common';
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
import { EmailService } from '../email/email.service';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { CreateUserInvitationDto } from './dto/create-user-invitation.dto';
import { CreateUserInvitationResponseDto } from './dto/create-user-invitation-response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

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
  async createInvitation(
    @Body() dto: CreateUserInvitationDto,
    @Headers('origin') origin?: string,
  ) {
    const result = await this.usersService.createInvitation(dto);
    const baseUrl = origin || process.env.FRONTEND_URL || 'https://energymonitor.click';
    const inviteUrl = `${baseUrl}/invite/${result.invitationToken}`;

    await this.emailService.sendInvitation(
      dto.email,
      dto.name,
      result.roleLabel,
      inviteUrl,
    );

    return result;
  }

  @Post('direct')
  @RequirePermissions('ADMIN_USERS', 'manage')
  @ApiOperation({ summary: 'Crear usuario directo', description: 'Crea un usuario que puede hacer login inmediatamente con Google o Microsoft, sin invitación.' })
  @ApiCreatedResponse({ type: AdminUserResponseDto })
  @ApiConflictResponse({ description: 'Ya existe un usuario con ese email' })
  async createDirectUser(@Body() dto: CreateUserInvitationDto) {
    return this.usersService.createDirectUser({
      email: dto.email,
      name: dto.name,
      roleId: dto.roleId,
      userMode: dto.userMode,
    });
  }

  @Delete()
  @RequirePermissions('ADMIN_USERS', 'manage')
  @ApiOperation({ summary: 'Eliminar usuarios', description: 'Elimina uno o más usuarios y sus sitios asociados.' })
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] } })
  @ApiOkResponse({ schema: { type: 'object', properties: { deleted: { type: 'number' } } } })
  async deleteUsers(@Body() body: { ids: string[] }) {
    const deleted = await this.usersService.deleteUsers(body.ids ?? []);
    return { deleted };
  }

  @Post(':id/resend')
  @RequirePermissions('ADMIN_USERS', 'manage')
  @ApiOperation({ summary: 'Reenviar invitación', description: 'Regenera el token de invitación y reenvía el email.' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Permiso ADMIN_USERS.manage requerido' })
  async resendInvitation(
    @Param('id') id: string,
    @Headers('origin') origin?: string,
  ) {
    const result = await this.usersService.resendInvitation(id);
    if (!result) throw new NotFoundException('User not found');

    const baseUrl = origin || process.env.FRONTEND_URL || 'https://energymonitor.click';
    const inviteUrl = `${baseUrl}/invite/${result.invitationToken}`;

    await this.emailService.sendInvitation(
      result.email,
      result.name,
      result.roleLabel,
      inviteUrl,
    );

    return { sent: true };
  }
}
