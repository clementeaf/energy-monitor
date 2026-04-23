import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IotReadingsService } from './iot-readings.service';
import { IotTimeSeriesDto, IotLatestDto, IotReadingsQueryDto, IotAlertsDto } from './dto/iot-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('IoT Readings')
@Controller('iot-readings')
export class IotReadingsController {
  constructor(private readonly service: IotReadingsService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest IoT reading for a meter' })
  @ApiResponse({ status: 200, description: 'Latest reading returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermission('readings', 'read')
  async getLatest(@CurrentUser() user: JwtPayload, @Query() query: IotLatestDto) {
    return this.service.getLatest(user.tenantId, user.buildingIds, query.meterId);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Get IoT time-series data with optional resolution and variable filter' })
  @ApiResponse({ status: 200, description: 'Time-series data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Get raw IoT readings for a meter within a date range' })
  @ApiResponse({ status: 200, description: 'Readings returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermission('readings', 'read')
  async getReadings(@CurrentUser() user: JwtPayload, @Query() query: IotReadingsQueryDto) {
    return this.service.getReadings(
      user.tenantId, user.buildingIds,
      query.meterId, query.from, query.to,
      query.limit ?? 100,
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get IoT-derived alerts (anomalies in voltage, PF, THD, etc.)' })
  @ApiResponse({ status: 200, description: 'Alerts returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermission('alerts', 'read')
  async getAlerts(@CurrentUser() user: JwtPayload, @Query() query: IotAlertsDto) {
    return this.service.getAlerts(user.tenantId, user.buildingIds, {
      severity: query.severity,
      meterId: query.meterId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get statistical summary for IoT readings in a date range' })
  @ApiResponse({ status: 200, description: 'Stats returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
