import { Controller, Get, Param, ParseUUIDPipe, Post, Body, Query, HttpCode, HttpStatus, Res, Headers, UseInterceptors, UseGuards, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiHeader } from '@nestjs/swagger';
import { UseReadReplica } from '../../database/use-read-replica.decorator';
import { ReadReplicaInterceptor } from '../../database/read-replica.interceptor';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission, RequireAnyPermission } from '../../common/guards/permissions.guard';
import { BuildingsService } from '../buildings/buildings.service';
import { MetersService } from '../meters/meters.service';
import { ReadingsService } from '../readings/readings.service';
import { MeasurementsIngressService } from '../readings/measurements-ingress.service';
import { CreateMeasurementDto } from '../readings/dto/create-measurement.dto';
import { AlertsService } from '../alerts/alerts.service';
import { MeterReadingStatusService } from '../ingest/meter-reading-status.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  ExternalMeterStatusResponse,
  toExternalMeterStatus,
} from './dto/external-meter-status.response';
import { ReadingQueryDto } from '../readings/dto/reading-query.dto';
import { LatestQueryDto } from '../readings/dto/latest-query.dto';
import { AggregatedQueryDto } from '../readings/dto/aggregated-query.dto';
import { AlertQueryDto } from '../alerts/dto/alert-query.dto';
import {
  ExternalMeasurementResponse,
  toExternalMeasurement,
} from './dto/external-measurement.response';
import {
  ExternalBuildingResponse,
  toExternalBuilding,
} from './dto/external-building.response';
import {
  ExternalMeterResponse,
  toExternalMeter,
} from './dto/external-meter.response';
import { TenantUnitsService } from '../tenant-units/tenant-units.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { ConcentratorsService } from '../concentrators/concentrators.service';
import { FaultEventsService } from '../fault-events/fault-events.service';
import { InvoicesService } from '../invoices/invoices.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { IotReadingsService } from '../iot-readings/iot-readings.service';
import { IntegrationsHealthService } from '../integrations/integrations-health.service';
import { CompareBuildingsQueryDto } from '../readings/dto/compare-buildings-query.dto';
import { QueryInvoicesDto } from '../invoices/dto/query-invoices.dto';
import { QueryFaultEventsDto } from '../fault-events/dto/query-fault-events.dto';
import { IotTimeSeriesDto, IotLatestDto, IotReadingsQueryDto, IotAlertsDto } from '../iot-readings/dto/iot-query.dto';
import { ReadingsExportService } from '../etl-export/readings-export.service';
import { ReadingsExportQueryDto } from '../etl-export/dto/readings-export-query.dto';
import { DataExportJobsService } from '../etl-export/data-export-jobs.service';
import { CreateExportJobDto } from '../etl-export/dto/create-export-job.dto';
import { ExportStorageService } from '../etl-export/export-storage.service';
import { ExternalExportJobResponse } from './dto/external-export-job.response';
import { DataContractGuard } from '../data-governance/data-contract.guard';
import { DATA_CONTRACT_VERSION_HEADER } from '../../common/constants/data-contracts';

/**
 * Versioned API for third-party consumers.
 * Authenticated via X-API-Key header (ApiKeyGuard) or Bearer OAuth JWT (JwtAuthGuard).
 * Same tenant/building scoping as internal API.
 */
@ApiTags('External API v1')
@Controller('v1')
export class ExternalApiController {
  constructor(
    private readonly buildingsService: BuildingsService,
    private readonly metersService: MetersService,
    private readonly readingsService: ReadingsService,
    private readonly measurementsIngressService: MeasurementsIngressService,
    private readonly alertsService: AlertsService,
    private readonly meterReadingStatusService: MeterReadingStatusService,
    private readonly tenantsService: TenantsService,
    private readonly readingsExportService: ReadingsExportService,
    private readonly dataExportJobsService: DataExportJobsService,
    private readonly exportStorageService: ExportStorageService,
    private readonly tenantUnitsService: TenantUnitsService,
    private readonly hierarchyService: HierarchyService,
    private readonly concentratorsService: ConcentratorsService,
    private readonly faultEventsService: FaultEventsService,
    private readonly invoicesService: InvoicesService,
    private readonly tariffsService: TariffsService,
    private readonly iotReadingsService: IotReadingsService,
    private readonly integrationsHealthService: IntegrationsHealthService,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Buildings                                                          */
  /* ------------------------------------------------------------------ */

  @Get('buildings')
  @RequireAnyPermission('buildings:read', 'admin_buildings:read')
  @ApiOperation({ summary: 'List all buildings' })
  @ApiResponse({ status: 200, description: 'Buildings list returned', type: [ExternalBuildingResponse] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listBuildings(@CurrentUser() user: JwtPayload): Promise<ExternalBuildingResponse[]> {
    const buildings = await this.buildingsService.findAll(user.tenantId, user.buildingIds);
    return buildings.map(toExternalBuilding);
  }

  @Get('buildings/:id')
  @RequireAnyPermission('buildings:read', 'admin_buildings:read')
  @ApiOperation({ summary: 'Get a building by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Building returned', type: ExternalBuildingResponse })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async getBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExternalBuildingResponse> {
    const building = await this.buildingsService.findOne(id, user.tenantId, user.buildingIds);
    if (!building) throw new NotFoundException('Building not found');
    return toExternalBuilding(building);
  }

  /* ------------------------------------------------------------------ */
  /*  Meters                                                             */
  /* ------------------------------------------------------------------ */

  @Get('meters')
  @RequireAnyPermission('meters:read', 'admin_meters:read')
  @ApiOperation({ summary: 'List all meters' })
  @ApiQuery({ name: 'buildingId', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'Meters list returned', type: [ExternalMeterResponse] })
  async listMeters(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ): Promise<ExternalMeterResponse[]> {
    const result = await this.metersService.findAll(user.tenantId, user.buildingIds, buildingId);
    return result.data.map(toExternalMeter);
  }

  @Get('meters/:id')
  @RequireAnyPermission('meters:read', 'admin_meters:read')
  @ApiOperation({ summary: 'Get a meter by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meter returned', type: ExternalMeterResponse })
  @ApiResponse({ status: 404, description: 'Meter not found' })
  async getMeter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExternalMeterResponse> {
    const meter = await this.metersService.findOne(id, user.tenantId, user.buildingIds);
    if (!meter) throw new NotFoundException('Meter not found');
    return toExternalMeter(meter);
  }

  @Get('meters/:id/status')
  @RequireAnyPermission('meters:read', 'admin_meters:read')
  @ApiOperation({ summary: 'Get meter ingest status (last reading, lag, stale flag)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meter status returned', type: ExternalMeterStatusResponse })
  async getMeterStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExternalMeterStatusResponse | null> {
    const tenant = await this.tenantsService.findById(user.tenantId);
    const status = await this.meterReadingStatusService.getStatusForMeter(
      id,
      user.tenantId,
      user.buildingIds,
      tenant.settings,
    );
    return status ? toExternalMeterStatus(status) : null;
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

  @Get('readings/latest-anchor')
  @RequirePermission('readings', 'read')
  @ApiOperation({ summary: 'Newest reading timestamp for chart date anchoring' })
  @ApiResponse({ status: 200, description: 'Anchor timestamp returned' })
  async getLatestAnchor(@CurrentUser() user: JwtPayload) {
    return this.readingsService.findLatestAnchor(user.tenantId, user.buildingIds, user.crossTenant);
  }

  @Get('readings/compare-buildings')
  @RequirePermission('readings', 'read')
  @ApiOperation({ summary: 'Compare dashboard bundle (current + previous periods by building)' })
  @ApiResponse({ status: 200, description: 'Compare bundle returned' })
  async getCompareBuildings(
    @CurrentUser() user: JwtPayload,
    @Query() query: CompareBuildingsQueryDto,
  ) {
    return this.readingsService.findCompareBuildings(
      user.tenantId,
      user.buildingIds,
      query.days,
      user.crossTenant,
    );
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

  @Post('measurements')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('readings', 'create')
  @ApiOperation({ summary: 'Ingest a single meter measurement (API ingress)' })
  @ApiBody({ type: CreateMeasurementDto })
  @ApiResponse({ status: 201, description: 'Measurement stored', type: ExternalMeasurementResponse })
  @ApiResponse({ status: 403, description: 'Meter not accessible for this API key' })
  @ApiResponse({ status: 409, description: 'Duplicate measurement (meter + timestamp + source)' })
  async createMeasurement(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMeasurementDto,
  ): Promise<ExternalMeasurementResponse> {
    const row = await this.measurementsIngressService.create(
      user.tenantId,
      user.buildingIds,
      dto,
    );
    return toExternalMeasurement(row);
  }

  @Get('readings/export')
  @UseGuards(DataContractGuard)
  @UseReadReplica()
  @UseInterceptors(ReadReplicaInterceptor)
  @RequirePermission('readings', 'export')
  @ApiOperation({ summary: 'Stream readings export as CSV (chunked, cursor pagination)' })
  @ApiHeader({
    name: 'X-Consumer-Id',
    required: false,
    description: 'Optional ETL consumer id; persists watermark cursor on completion',
  })
  @ApiHeader({
    name: 'X-Data-Contract-Version',
    required: false,
    description: 'Optional contract name@version (e.g. readings-export@1.0.0); 400 if mismatch',
  })
  @ApiResponse({ status: 200, description: 'CSV stream; X-Next-Cursor header when more data exists' })
  async exportReadings(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReadingsExportQueryDto,
    @Headers('x-consumer-id') consumerId: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.readingsExportService.streamCsvExport(
      user.tenantId,
      user.buildingIds,
      query,
      res,
      consumerId,
    );
  }

  @Post('exports')
  @UseGuards(DataContractGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission('readings', 'export')
  @ApiOperation({ summary: 'Create async export job (CSV or Parquet)' })
  @ApiBody({ type: CreateExportJobDto })
  @ApiHeader({
    name: DATA_CONTRACT_VERSION_HEADER,
    required: false,
    description: 'Optional contract name@version; 400 if mismatch',
  })
  @ApiResponse({ status: 202, description: 'Export job accepted', type: ExternalExportJobResponse })
  async createExportJob(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExportJobDto,
  ): Promise<ExternalExportJobResponse> {
    const job = await this.dataExportJobsService.create(user.tenantId, user.buildingIds, dto);
    return {
      id: job.id,
      format: job.format,
      status: job.status,
      rowCount: job.rowCount,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      expiresAt: job.expiresAt,
      downloadUrl: null,
    };
  }

  @Get('exports/:id/download')
  @RequirePermission('readings', 'export')
  @ApiOperation({ summary: 'Download completed export file (local dev storage)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'File download' })
  async downloadExportJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const job = await this.dataExportJobsService.getJobForDownload(id, user.tenantId);
    const buffer = this.exportStorageService.readLocalFile(job.localPath!);
    const ext = job.format === 'parquet' ? 'parquet' : 'csv';
    const mime = job.format === 'parquet' ? 'application/octet-stream' : 'text/csv; charset=utf-8';
    res.set({
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="readings-export-${job.id}.${ext}"`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  @Get('exports/:id')
  @RequirePermission('readings', 'export')
  @ApiOperation({ summary: 'Get export job status and download URL when ready' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Job status', type: ExternalExportJobResponse })
  async getExportJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExternalExportJobResponse> {
    return this.dataExportJobsService.getStatus(id, user.tenantId);
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
    const alert = await this.alertsService.findOne(id, user.tenantId, user.buildingIds);
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  /* ------------------------------------------------------------------ */
  /*  Tenant units, hierarchy, concentrators, faults                     */
  /* ------------------------------------------------------------------ */

  @Get('tenant-units')
  @RequirePermission('tenant_units', 'read')
  @ApiOperation({ summary: 'List tenant units (locatarios)' })
  @ApiQuery({ name: 'buildingId', required: false, type: 'string' })
  async listTenantUnits(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.tenantUnitsService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get('tenant-units/:id')
  @RequirePermission('tenant_units', 'read')
  @ApiOperation({ summary: 'Get tenant unit by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTenantUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const unit = await this.tenantUnitsService.findOne(id, user.tenantId, user.buildingIds);
    if (!unit) throw new NotFoundException('Tenant unit not found');
    return unit;
  }

  @Get('hierarchy/buildings/:buildingId')
  @RequirePermission('hierarchy', 'read')
  @ApiOperation({ summary: 'Hierarchy tree for a building' })
  @ApiParam({ name: 'buildingId', type: 'string', format: 'uuid' })
  async getHierarchyByBuilding(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hierarchyService.findByBuilding(user.tenantId, buildingId, user.buildingIds);
  }

  @Get('concentrators')
  @RequirePermission('concentrators', 'read')
  @ApiOperation({ summary: 'List concentrators' })
  @ApiQuery({ name: 'buildingId', required: false, type: 'string' })
  async listConcentrators(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.concentratorsService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get('concentrators/:id')
  @RequirePermission('concentrators', 'read')
  @ApiOperation({ summary: 'Get concentrator by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getConcentrator(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const row = await this.concentratorsService.findOne(id, user.tenantId, user.buildingIds);
    if (!row) throw new NotFoundException('Concentrator not found');
    return row;
  }

  @Get('fault-events')
  @RequirePermission('fault_events', 'read')
  @ApiOperation({ summary: 'List fault events with filters' })
  async listFaultEvents(
    @Query() query: QueryFaultEventsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.faultEventsService.findAll(user.tenantId, user.buildingIds, query);
  }

  @Get('fault-events/:id')
  @RequirePermission('fault_events', 'read')
  @ApiOperation({ summary: 'Get fault event by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getFaultEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const event = await this.faultEventsService.findOne(id, user.tenantId, user.buildingIds);
    if (!event) throw new NotFoundException('Fault event not found');
    return event;
  }

  /* ------------------------------------------------------------------ */
  /*  Billing (read-only)                                                */
  /* ------------------------------------------------------------------ */

  @Get('invoices')
  @RequireAnyPermission('billing:read', 'billing:view_own')
  @ApiOperation({ summary: 'List invoices with filters' })
  async listInvoices(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryInvoicesDto,
  ) {
    return this.invoicesService.findAll(user.tenantId, user.buildingIds, {
      buildingId: query.buildingId,
      status: query.status,
      periodStart: query.periodStart,
      periodEnd: query.periodEnd,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('invoices/:id')
  @RequireAnyPermission('billing:read', 'billing:view_own')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const invoice = await this.invoicesService.findOne(id, user.tenantId, user.buildingIds);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Get('tariffs')
  @RequireAnyPermission('billing:read', 'billing:view_own')
  @ApiOperation({ summary: 'List tariffs' })
  @ApiQuery({ name: 'buildingId', required: false, type: 'string' })
  async listTariffs(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.tariffsService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get('tariffs/:id')
  @RequireAnyPermission('billing:read', 'billing:view_own')
  @ApiOperation({ summary: 'Get tariff by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTariff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const tariff = await this.tariffsService.findOne(id, user.tenantId, user.buildingIds);
    if (!tariff) throw new NotFoundException('Tariff not found');
    return tariff;
  }

  @Get('tariffs/:id/blocks')
  @RequireAnyPermission('billing:read', 'billing:view_own')
  @ApiOperation({ summary: 'List tariff time blocks' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async listTariffBlocks(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tariffsService.findBlocks(id, user.tenantId);
  }

  /* ------------------------------------------------------------------ */
  /*  IoT readings (Siemens / MQTT)                                      */
  /* ------------------------------------------------------------------ */

  @Get('iot-readings/latest')
  @RequirePermission('readings', 'read')
  @ApiOperation({ summary: 'Latest IoT reading for a meter' })
  async getIotLatest(@CurrentUser() user: JwtPayload, @Query() query: IotLatestDto) {
    return this.iotReadingsService.getLatest(user.tenantId, user.buildingIds, query.meterId);
  }

  @Get('iot-readings/timeseries')
  @RequirePermission('readings', 'read')
  @ApiOperation({ summary: 'IoT time-series with optional resolution' })
  async getIotTimeSeries(@CurrentUser() user: JwtPayload, @Query() query: IotTimeSeriesDto) {
    const variables = query.variables?.split(',').map((v) => v.trim()) ?? [];
    return this.iotReadingsService.getTimeSeries(
      user.tenantId,
      user.buildingIds,
      query.meterId,
      query.from,
      query.to,
      variables,
      query.resolution ?? 'raw',
    );
  }

  @Get('iot-readings')
  @RequirePermission('readings', 'read')
  @ApiOperation({ summary: 'Raw IoT readings for a meter in date range' })
  async getIotReadings(@CurrentUser() user: JwtPayload, @Query() query: IotReadingsQueryDto) {
    return this.iotReadingsService.getReadings(
      user.tenantId,
      user.buildingIds,
      query.meterId,
      query.from,
      query.to,
      query.limit ?? 100,
    );
  }

  @Get('iot-readings/alerts')
  @RequirePermission('alerts', 'read')
  @ApiOperation({ summary: 'IoT-derived anomaly alerts' })
  async getIotAlerts(@CurrentUser() user: JwtPayload, @Query() query: IotAlertsDto) {
    return this.iotReadingsService.getAlerts(user.tenantId, user.buildingIds, {
      severity: query.severity,
      meterId: query.meterId,
    });
  }

  @Get('iot-readings/stats')
  @RequirePermission('readings', 'read')
  @ApiOperation({ summary: 'Statistical summary for IoT readings' })
  async getIotStats(@CurrentUser() user: JwtPayload, @Query() query: IotTimeSeriesDto) {
    return this.iotReadingsService.getStats(
      user.tenantId,
      user.buildingIds,
      query.meterId,
      query.from,
      query.to,
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Integrations                                                       */
  /* ------------------------------------------------------------------ */

  @Get('integrations/health')
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'Integration connector health summary' })
  async getIntegrationsHealth(@CurrentUser() user: JwtPayload) {
    return this.integrationsHealthService.getHealth(user.tenantId);
  }
}
