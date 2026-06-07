import { Controller, Get, Param, ParseUUIDPipe, Post, Body, Query, HttpCode, HttpStatus, Res, Headers, UseInterceptors, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiHeader } from '@nestjs/swagger';
import { UseReadReplica } from '../../database/use-read-replica.decorator';
import { ReadReplicaInterceptor } from '../../database/read-replica.interceptor';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';
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
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Buildings                                                          */
  /* ------------------------------------------------------------------ */

  @Get('buildings')
  @RequirePermission('buildings', 'read')
  @ApiOperation({ summary: 'List all buildings' })
  @ApiResponse({ status: 200, description: 'Buildings list returned', type: [ExternalBuildingResponse] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listBuildings(@CurrentUser() user: JwtPayload): Promise<ExternalBuildingResponse[]> {
    const buildings = await this.buildingsService.findAll(user.tenantId, user.buildingIds);
    return buildings.map(toExternalBuilding);
  }

  @Get('buildings/:id')
  @RequirePermission('buildings', 'read')
  @ApiOperation({ summary: 'Get a building by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Building returned', type: ExternalBuildingResponse })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async getBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExternalBuildingResponse | null> {
    const building = await this.buildingsService.findOne(id, user.tenantId, user.buildingIds);
    return building ? toExternalBuilding(building) : null;
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

  @Get('meters/:id/status')
  @RequirePermission('meters', 'read')
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
    return this.alertsService.findOne(id, user.tenantId, user.buildingIds);
  }
}
