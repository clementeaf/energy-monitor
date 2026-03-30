import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertQueryDto } from './dto/alert-query.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../common/guards/permissions.guard';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @RequireAnyPermission('admin_alerts:read', 'monitoring_alerts:read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: AlertQueryDto,
  ) {
    return this.alertsService.findAll(user.tenantId, user.buildingIds, query);
  }

  @Get(':id')
  @RequireAnyPermission('admin_alerts:read', 'monitoring_alerts:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const alert = await this.alertsService.findOne(id, user.tenantId, user.buildingIds);
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  @Patch(':id/acknowledge')
  @RequireAnyPermission('admin_alerts:update', 'monitoring_alerts:update')
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const alert = await this.alertsService.acknowledge(id, user.tenantId, user.buildingIds, user.sub);
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  @Patch(':id/resolve')
  @RequireAnyPermission('admin_alerts:update', 'monitoring_alerts:update')
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const alert = await this.alertsService.resolve(
      id,
      user.tenantId,
      user.buildingIds,
      user.sub,
      dto.resolutionNotes,
    );
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }
}
