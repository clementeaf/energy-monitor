import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MetersService } from './meters.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../../common/guards/permissions.guard';

@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get()
  @RequireAnyPermission('admin_meters:read', 'dashboard_executive:read', 'dashboard_technical:read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.metersService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
  @RequireAnyPermission('admin_meters:read', 'dashboard_executive:read', 'dashboard_technical:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const meter = await this.metersService.findOne(id, user.tenantId, user.buildingIds);
    if (!meter) throw new NotFoundException('Meter not found');
    return meter;
  }

  @Post()
  @RequirePermission('admin_meters', 'create')
  async create(
    @Body() dto: CreateMeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.metersService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_meters', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const meter = await this.metersService.update(id, user.tenantId, dto);
    if (!meter) throw new NotFoundException('Meter not found');
    return meter;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_meters', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.metersService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Meter not found');
  }
}
