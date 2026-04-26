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
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../../common/guards/permissions.guard';

@ApiTags('Buildings')
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all buildings for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of buildings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequireAnyPermission('admin_buildings:read', 'dashboard_executive:read', 'dashboard_technical:read')
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.buildingsService.findAll(user.tenantId, user.buildingIds, user.crossTenant);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a building by ID' })
  @ApiResponse({ status: 200, description: 'Building found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Building not found' })
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
  @ApiOperation({ summary: 'Create a new building' })
  @ApiResponse({ status: 201, description: 'Building created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermission('admin_buildings', 'create')
  async create(
    @Body() dto: CreateBuildingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = user.crossTenant && dto.tenantId ? dto.tenantId : user.tenantId;
    return this.buildingsService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a building' })
  @ApiResponse({ status: 200, description: 'Building updated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Building not found' })
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
  @ApiOperation({ summary: 'Delete a building' })
  @ApiResponse({ status: 204, description: 'Building deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Building not found' })
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
