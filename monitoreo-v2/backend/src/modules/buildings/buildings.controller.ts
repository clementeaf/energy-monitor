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
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../../common/guards/permissions.guard';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @RequireAnyPermission('admin_buildings:read', 'dashboard_executive:read', 'dashboard_technical:read')
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.buildingsService.findAll(user.tenantId, user.buildingIds);
  }

  @Get(':id')
  @RequireAnyPermission('admin_buildings:read', 'dashboard_executive:read', 'dashboard_technical:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const building = await this.buildingsService.findOne(id, user.tenantId, user.buildingIds);
    if (!building) throw new NotFoundException('Building not found');
    return building;
  }

  @Post()
  @RequirePermission('admin_buildings', 'create')
  async create(
    @Body() dto: CreateBuildingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buildingsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_buildings', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBuildingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const building = await this.buildingsService.update(id, user.tenantId, dto);
    if (!building) throw new NotFoundException('Building not found');
    return building;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_buildings', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.buildingsService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Building not found');
  }
}
