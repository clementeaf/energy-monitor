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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignBuildingsDto } from './dto/assign-buildings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('admin_users', 'read')
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('admin_users', 'read')
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
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_users', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const updated = await this.usersService.update(id, user.tenantId, dto);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_users', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.usersService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('User not found');
  }

  @Get(':id/buildings')
  @RequirePermission('admin_users', 'read')
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
}
