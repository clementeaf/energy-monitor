import { Controller, Get, Query } from '@nestjs/common';
import { IotReadingsService } from './iot-readings.service';
import { IotTimeSeriesDto, IotLatestDto, IotReadingsQueryDto, IotAlertsDto } from './dto/iot-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('iot-readings')
export class IotReadingsController {
  constructor(private readonly service: IotReadingsService) {}

  @Get('latest')
  @RequirePermission('readings', 'read')
  async getLatest(@CurrentUser() user: JwtPayload, @Query() query: IotLatestDto) {
    return this.service.getLatest(user.tenantId, user.buildingIds, query.meterId);
  }

  @Get('timeseries')
  @RequirePermission('readings', 'read')
  async getTimeSeries(@CurrentUser() user: JwtPayload, @Query() query: IotTimeSeriesDto) {
    const variables = query.variables?.split(',').map((v) => v.trim()) ?? [];
    return this.service.getTimeSeries(
      user.tenantId, user.buildingIds,
      query.meterId, query.from, query.to,
      variables, query.resolution ?? 'raw',
    );
  }

  @Get()
  @RequirePermission('readings', 'read')
  async getReadings(@CurrentUser() user: JwtPayload, @Query() query: IotReadingsQueryDto) {
    return this.service.getReadings(
      user.tenantId, user.buildingIds,
      query.meterId, query.from, query.to,
      query.limit ?? 100,
    );
  }

  @Get('alerts')
  @RequirePermission('alerts', 'read')
  async getAlerts(@CurrentUser() user: JwtPayload, @Query() query: IotAlertsDto) {
    return this.service.getAlerts(user.tenantId, user.buildingIds, {
      severity: query.severity,
      meterId: query.meterId,
    });
  }

  @Get('stats')
  @RequirePermission('readings', 'read')
  async getStats(
    @CurrentUser() user: JwtPayload,
    @Query() query: IotTimeSeriesDto,
  ) {
    return this.service.getStats(
      user.tenantId, user.buildingIds,
      query.meterId, query.from, query.to,
    );
  }
}
