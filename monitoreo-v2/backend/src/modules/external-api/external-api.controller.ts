import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
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
  async listBuildings(@CurrentUser() user: JwtPayload) {
    return this.buildingsService.findAll(user.tenantId, user.buildingIds);
  }

  @Get('buildings/:id')
  @RequirePermission('buildings', 'read')
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
  async listMeters(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.metersService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get('meters/:id')
  @RequirePermission('meters', 'read')
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
  async getReadings(@CurrentUser() user: JwtPayload, @Query() query: ReadingQueryDto) {
    return this.readingsService.findByMeter(user.tenantId, user.buildingIds, query);
  }

  @Get('readings/latest')
  @RequirePermission('readings', 'read')
  async getLatestReadings(@CurrentUser() user: JwtPayload, @Query() query: LatestQueryDto) {
    return this.readingsService.findLatest(user.tenantId, user.buildingIds, query);
  }

  @Get('readings/aggregated')
  @RequirePermission('readings', 'read')
  async getAggregatedReadings(@CurrentUser() user: JwtPayload, @Query() query: AggregatedQueryDto) {
    return this.readingsService.findAggregated(user.tenantId, user.buildingIds, query);
  }

  /* ------------------------------------------------------------------ */
  /*  Alerts                                                             */
  /* ------------------------------------------------------------------ */

  @Get('alerts')
  @RequirePermission('alerts', 'read')
  async listAlerts(@CurrentUser() user: JwtPayload, @Query() query: AlertQueryDto) {
    return this.alertsService.findAll(user.tenantId, user.buildingIds, query);
  }

  @Get('alerts/:id')
  @RequirePermission('alerts', 'read')
  async getAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertsService.findOne(id, user.tenantId, user.buildingIds);
  }
}
