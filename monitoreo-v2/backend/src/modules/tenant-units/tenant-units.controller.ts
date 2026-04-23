import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TenantUnitsService } from './tenant-units.service';
import { CreateTenantUnitDto } from './dto/create-tenant-unit.dto';
import { UpdateTenantUnitDto } from './dto/update-tenant-unit.dto';
import { AddTenantUnitMeterDto } from './dto/add-tenant-unit-meter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Tenant Units')
@Controller('tenant-units')
export class TenantUnitsController {
  constructor(private readonly tenantUnitsService: TenantUnitsService) {}

  @Get()
  @RequirePermission('admin_tenants_units', 'read')
  @ApiOperation({ summary: 'List all tenant units' })
  @ApiQuery({ name: 'buildingId', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'Tenant units list returned' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.tenantUnitsService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
  @RequirePermission('admin_tenants_units', 'read')
  @ApiOperation({ summary: 'Get a tenant unit by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tenant unit returned' })
  @ApiResponse({ status: 404, description: 'Tenant unit not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const unit = await this.tenantUnitsService.findOne(id, user.tenantId, user.buildingIds);
    if (!unit) throw new NotFoundException('Tenant unit not found');
    return unit;
  }

  @Post()
  @RequirePermission('admin_tenants_units', 'create')
  @ApiOperation({ summary: 'Create a tenant unit' })
  @ApiResponse({ status: 201, description: 'Tenant unit created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Body() dto: CreateTenantUnitDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantUnitsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_tenants_units', 'update')
  @ApiOperation({ summary: 'Update a tenant unit' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tenant unit updated' })
  @ApiResponse({ status: 404, description: 'Tenant unit not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantUnitDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const unit = await this.tenantUnitsService.update(id, user.tenantId, dto);
    if (!unit) throw new NotFoundException('Tenant unit not found');
    return unit;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_tenants_units', 'delete')
  @ApiOperation({ summary: 'Delete a tenant unit' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Tenant unit deleted' })
  @ApiResponse({ status: 404, description: 'Tenant unit not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.tenantUnitsService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Tenant unit not found');
  }

  @Get(':id/meters')
  @RequirePermission('admin_tenants_units', 'read')
  @ApiOperation({ summary: 'List meters assigned to a tenant unit' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meters list returned' })
  async findMeters(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantUnitsService.findMeters(id, user.tenantId);
  }

  @Post(':id/meters')
  @RequirePermission('admin_tenants_units', 'update')
  @ApiOperation({ summary: 'Assign a meter to a tenant unit' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Meter assigned' })
  @ApiResponse({ status: 404, description: 'Tenant unit not found' })
  async addMeter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTenantUnitMeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const entry = await this.tenantUnitsService.addMeter(id, dto.meterId, user.tenantId);
    if (!entry) throw new NotFoundException('Tenant unit not found');
    return entry;
  }

  @Delete(':id/meters/:meterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_tenants_units', 'update')
  @ApiOperation({ summary: 'Remove a meter from a tenant unit' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'meterId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Meter removed' })
  @ApiResponse({ status: 404, description: 'Tenant unit or meter link not found' })
  async removeMeter(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('meterId', ParseUUIDPipe) meterId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.tenantUnitsService.removeMeter(id, meterId, user.tenantId);
    if (!deleted) throw new NotFoundException('Tenant unit or meter link not found');
  }
}
