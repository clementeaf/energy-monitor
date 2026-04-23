import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';
import { BuildingsService } from '../buildings/buildings.service';
import { MetersService } from '../meters/meters.service';
import { ReadingsService } from '../readings/readings.service';
import { AlertsService } from '../alerts/alerts.service';
import { ReadingQueryDto } from '../readings/dto/reading-query.dto';
import { LatestQueryDto } from '../readings/dto/latest-query.dto';
import { AggregatedQueryDto } from '../readings/dto/aggregated-query.dto';
import { AlertQueryDto } from '../alerts/dto/alert-query.dto';

/**
 * Versioned read-only API for third-party consumers.
 * Authenticated via X-API-Key header (ApiKeyGuard).
 * Same tenant/building scoping as internal API.
 */
@ApiTags('External API v1')
@Controller('v1')
export class ExternalApiController {
  constructor(
    private readonly buildingsService: BuildingsService,
    private readonly metersService: MetersService,
    private readonly readingsService: ReadingsService,
    private readonly alertsService: AlertsService,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Buildings                                                          */
  /* ------------------------------------------------------------------ */

  @Get('buildings')
  @RequirePermission('buildings', 'read')
  @ApiOperation({ summary: 'List all buildings' })
  @ApiResponse({ status: 200, description: 'Buildings list returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listBuildings(@CurrentUser() user: JwtPayload) {
    return this.buildingsService.findAll(user.tenantId, user.buildingIds);
  }

  @Get('buildings/:id')
  @RequirePermission('buildings', 'read')
  @ApiOperation({ summary: 'Get a building by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Building returned' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async getBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buildingsService.findOne(id, user.tenantId, user.buildingIds);
  }

  /* ------------------------------------------------------------------ */
  /*  Meters                                                             */
  /* ------------------------------------------------------------------ */

  @Get('meters')
  @RequirePermission('meters', 'read')
  @ApiOperation({ summary: 'List all meters' })
  @ApiQuery({ name: 'buildingId', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'Meters list returned' })
  async listMeters(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.metersService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get('meters/:id')
  @RequirePermission('meters', 'read')
  @ApiOperation({ summary: 'Get a meter by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meter returned' })
  @ApiResponse({ status: 404, description: 'Meter not found' })
  async getMeter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.metersService.findOne(id, user.tenantId, user.buildingIds);
  }

  /* ------------------------------------------------------------------ */
  /*  Readings                                                           */
  /* ------------------------------------------------------------------ */

  @Get('readings')
  @RequirePermission('readings', 'read')
  @ApiOperation({ summary: 'Get time-series readings with downsampling' })
  @ApiResponse({ status: 200, description: 'Readings returned' })
  async getReadings(@CurrentUser() user: JwtPayload, @Query() query: ReadingQueryDto) {
    return this.readingsService.findByMeter(user.tenantId, user.buildingIds, query);
  }

  @Get('readings/latest')
  @RequirePermission('readings', 'read')
  @ApiOperation({ summary: 'Get latest reading per meter' })
  @ApiResponse({ status: 200, description: 'Latest readings returned' })
  async getLatestReadings(@CurrentUser() user: JwtPayload, @Query() query: LatestQueryDto) {
    return this.readingsService.findLatest(user.tenantId, user.buildingIds, query);
  }

  @Get('readings/aggregated')
  @RequirePermission('readings', 'read')
  @ApiOperation({ summary: 'Get aggregated readings (hourly/daily/monthly)' })
  @ApiResponse({ status: 200, description: 'Aggregated readings returned' })
  async getAggregatedReadings(@CurrentUser() user: JwtPayload, @Query() query: AggregatedQueryDto) {
    return this.readingsService.findAggregated(user.tenantId, user.buildingIds, query);
  }

  /* ------------------------------------------------------------------ */
  /*  Alerts                                                             */
  /* ------------------------------------------------------------------ */

  @Get('alerts')
  @RequirePermission('alerts', 'read')
  @ApiOperation({ summary: 'List alerts with filters' })
  @ApiResponse({ status: 200, description: 'Alerts list returned' })
  async listAlerts(@CurrentUser() user: JwtPayload, @Query() query: AlertQueryDto) {
    return this.alertsService.findAll(user.tenantId, user.buildingIds, query);
  }

  @Get('alerts/:id')
  @RequirePermission('alerts', 'read')
  @ApiOperation({ summary: 'Get an alert by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Alert returned' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async getAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertsService.findOne(id, user.tenantId, user.buildingIds);
  }
}
