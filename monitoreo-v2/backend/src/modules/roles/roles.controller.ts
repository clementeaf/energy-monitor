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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Roles & Permissions')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /** List all roles for the current tenant. */
  @Get()
  @RequirePermission('admin_roles', 'read')
  @ApiOperation({ summary: 'List all roles for current tenant' })
  @ApiResponse({ status: 200, description: 'Role list' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.rolesService.findAllForTenant(user.tenantId);
  }

  /** Global permissions catalog. */
  @Get('permissions')
  @RequirePermission('admin_roles', 'read')
  @ApiOperation({ summary: 'Get global permissions catalog' })
  @ApiResponse({ status: 200, description: 'All available permissions' })
  async getPermissionsCatalog() {
    return this.rolesService.getAllPermissions();
  }

  @Get(':id')
  @RequirePermission('admin_roles', 'read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role found' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const role = await this.rolesService.findOne(id, user.tenantId);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  @Post()
  @RequirePermission('admin_roles', 'create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: JwtPayload) {
    return this.rolesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_roles', 'update')
  @ApiOperation({ summary: 'Update role by ID' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'Role not found' })
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
  @ApiOperation({ summary: 'Delete role by ID' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.rolesService.remove(id, user.tenantId);
    if (!ok) throw new NotFoundException('Role not found');
  }

  /** Get permissions assigned to a role. */
  @Get(':id/permissions')
  @RequirePermission('admin_roles', 'read')
  @ApiOperation({ summary: 'Get permissions assigned to a role' })
  @ApiResponse({ status: 200, description: 'Permission list for role' })
  async getPermissions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.rolesService.getRolePermissions(id, user.tenantId);
  }

  /** Replace all permissions for a role (bulk assign). */
  @Put(':id/permissions')
  @RequirePermission('admin_roles', 'update')
  @ApiOperation({ summary: 'Replace all permissions for a role' })
  @ApiResponse({ status: 200, description: 'Permissions assigned' })
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rolesService.assignPermissions(id, user.tenantId, dto.permissionIds);
  }
}
