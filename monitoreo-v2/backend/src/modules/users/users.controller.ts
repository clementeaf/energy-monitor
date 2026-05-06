import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  NotFoundException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignBuildingsDto } from './dto/assign-buildings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('admin_users', 'read')
  @ApiOperation({ summary: 'List all users for current tenant' })
  @ApiResponse({ status: 200, description: 'User list' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('admin_users', 'read')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const found = await this.usersService.findOne(id, user.tenantId);
    if (!found) throw new NotFoundException('User not found');
    return found;
  }

  @Post()
  @RequirePermission('admin_users', 'create')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.create(user.tenantId, dto, user.roleId, user.roleSlug);
  }

  @Patch(':id')
  @RequirePermission('admin_users', 'update')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const updated = await this.usersService.update(id, user.tenantId, dto, user.roleId, user.roleSlug);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_users', 'delete')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.usersService.enforceDeleteHierarchy(user.roleId, user.roleSlug, id, user.tenantId);
    const deleted = await this.usersService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('User not found');
  }

  @Get(':id/buildings')
  @RequirePermission('admin_users', 'read')
  @ApiOperation({ summary: 'Get building IDs assigned to a user' })
  @ApiResponse({ status: 200, description: 'Building IDs list' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getBuildingIds(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const found = await this.usersService.findOne(id, user.tenantId);
    if (!found) throw new NotFoundException('User not found');
    const buildingIds = await this.usersService.getBuildingIds(id);
    return { buildingIds };
  }

  @Patch(':id/buildings')
  @RequirePermission('admin_users', 'update')
  @ApiOperation({ summary: 'Assign buildings to a user' })
  @ApiResponse({ status: 200, description: 'Buildings assigned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async assignBuildings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignBuildingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const found = await this.usersService.findOne(id, user.tenantId);
    if (!found) throw new NotFoundException('User not found');
    await this.usersService.assignBuildings(id, user.tenantId, dto.buildingIds);
    return { buildingIds: dto.buildingIds };
  }

  @Patch(':id/unblock')
  @RequirePermission('admin_users', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock user data processing (Ley 21.719 Art. 8 ter)' })
  @ApiResponse({ status: 200, description: 'Processing unblocked' })
  async unblockProcessing(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.usersService.unblockProcessing(id);
    return { success: true };
  }
}
