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
import { TenantUnitsService } from './tenant-units.service';
import { CreateTenantUnitDto } from './dto/create-tenant-unit.dto';
import { UpdateTenantUnitDto } from './dto/update-tenant-unit.dto';
import { AddTenantUnitMeterDto } from './dto/add-tenant-unit-meter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('tenant-units')
export class TenantUnitsController {
  constructor(private readonly tenantUnitsService: TenantUnitsService) {}

  @Get()
  @RequirePermission('admin_tenant_units', 'read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.tenantUnitsService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
  @RequirePermission('admin_tenant_units', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const unit = await this.tenantUnitsService.findOne(id, user.tenantId, user.buildingIds);
    if (!unit) throw new NotFoundException('Tenant unit not found');
    return unit;
  }

  @Post()
  @RequirePermission('admin_tenant_units', 'create')
  async create(
    @Body() dto: CreateTenantUnitDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantUnitsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_tenant_units', 'update')
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
  @RequirePermission('admin_tenant_units', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.tenantUnitsService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Tenant unit not found');
  }

  @Get(':id/meters')
  @RequirePermission('admin_tenant_units', 'read')
  async findMeters(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantUnitsService.findMeters(id, user.tenantId);
  }

  @Post(':id/meters')
  @RequirePermission('admin_tenant_units', 'update')
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
  @RequirePermission('admin_tenant_units', 'update')
  async removeMeter(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('meterId', ParseUUIDPipe) meterId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.tenantUnitsService.removeMeter(id, meterId, user.tenantId);
    if (!deleted) throw new NotFoundException('Tenant unit or meter link not found');
  }
}
