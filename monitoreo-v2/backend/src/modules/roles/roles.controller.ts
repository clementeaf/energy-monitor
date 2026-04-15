import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /** List all roles for the current tenant. */
  @Get()
  @RequirePermission('admin_roles', 'read')
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.rolesService.findAllForTenant(user.tenantId);
  }

  /** Global permissions catalog. */
  @Get('permissions')
  @RequirePermission('admin_roles', 'read')
  async getPermissionsCatalog() {
    return this.rolesService.getAllPermissions();
  }

  @Get(':id')
  @RequirePermission('admin_roles', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const role = await this.rolesService.findOne(id, user.tenantId);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  @Post()
  @RequirePermission('admin_roles', 'create')
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: JwtPayload) {
    return this.rolesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_roles', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const role = await this.rolesService.update(id, user.tenantId, dto);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_roles', 'update')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.rolesService.remove(id, user.tenantId);
    if (!ok) throw new NotFoundException('Role not found');
  }

  /** Get permissions assigned to a role. */
  @Get(':id/permissions')
  @RequirePermission('admin_roles', 'read')
  async getPermissions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.rolesService.getRolePermissions(id, user.tenantId);
  }

  /** Replace all permissions for a role (bulk assign). */
  @Put(':id/permissions')
  @RequirePermission('admin_roles', 'update')
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rolesService.assignPermissions(id, user.tenantId, dto.permissionIds);
  }
}
