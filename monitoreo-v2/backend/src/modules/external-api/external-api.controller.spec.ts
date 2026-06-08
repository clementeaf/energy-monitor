import { Test } from '@nestjs/testing';
import { ExternalApiController } from './external-api.controller';
import { BuildingsService } from '../buildings/buildings.service';
import { MetersService } from '../meters/meters.service';
import { ReadingsService } from '../readings/readings.service';
import { MeasurementsIngressService } from '../readings/measurements-ingress.service';
import { AlertsService } from '../alerts/alerts.service';
import { MeterReadingStatusService } from '../ingest/meter-reading-status.service';
import { TenantsService } from '../tenants/tenants.service';
import { ReadingsExportService } from '../etl-export/readings-export.service';
import { DataExportJobsService } from '../etl-export/data-export-jobs.service';
import { ExportStorageService } from '../etl-export/export-storage.service';
import { TenantUnitsService } from '../tenant-units/tenant-units.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { ConcentratorsService } from '../concentrators/concentrators.service';
import { FaultEventsService } from '../fault-events/fault-events.service';
import { InvoicesService } from '../invoices/invoices.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { IotReadingsService } from '../iot-readings/iot-readings.service';
import { IntegrationsHealthService } from '../integrations/integrations-health.service';
import { DataContractGuard } from '../data-governance/data-contract.guard';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'apikey:ak-1',
  email: 'apikey-emk_abcd@system',
  tenantId: 't-1',
  roleId: 'api_key',
  roleSlug: 'api_key',
  permissions: ['buildings:read', 'meters:read', 'readings:read', 'alerts:read'],
  buildingIds: ['b-1'],
};

describe('ExternalApiController', () => {
  let controller: ExternalApiController;
  let buildingsSvc: Record<string, jest.Mock>;
  let metersSvc: Record<string, jest.Mock>;
  let readingsSvc: Record<string, jest.Mock>;
  let ingressSvc: Record<string, jest.Mock>;
  let alertsSvc: Record<string, jest.Mock>;
  let meterStatusSvc: Record<string, jest.Mock>;
  let tenantsSvc: Record<string, jest.Mock>;
  let exportSvc: Record<string, jest.Mock>;
  let exportJobsSvc: Record<string, jest.Mock>;
  let exportStorageSvc: Record<string, jest.Mock>;
  let tenantUnitsSvc: Record<string, jest.Mock>;
  let hierarchySvc: Record<string, jest.Mock>;
  let concentratorsSvc: Record<string, jest.Mock>;
  let faultEventsSvc: Record<string, jest.Mock>;
  let invoicesSvc: Record<string, jest.Mock>;
  let tariffsSvc: Record<string, jest.Mock>;
  let iotReadingsSvc: Record<string, jest.Mock>;
  let integrationsHealthSvc: Record<string, jest.Mock>;

  beforeEach(async () => {
    buildingsSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    metersSvc = { findAll: jest.fn().mockResolvedValue({ data: [], total: 0, limit: 0, offset: 0 }), findOne: jest.fn() };
    readingsSvc = {
      findByMeter: jest.fn().mockResolvedValue([]),
      findLatest: jest.fn().mockResolvedValue([]),
      findAggregated: jest.fn().mockResolvedValue([]),
      findLatestAnchor: jest.fn().mockResolvedValue({ timestamp: null }),
      findCompareBuildings: jest.fn().mockResolvedValue({
        anchor: null,
        from: '2026-01-01',
        to: '2026-01-31',
        previousFrom: '2025-12-01',
        previousTo: '2025-12-31',
        current: [],
        previous: [],
      }),
    };
    ingressSvc = { create: jest.fn() };
    alertsSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    meterStatusSvc = { getStatusForMeter: jest.fn() };
    tenantsSvc = { findById: jest.fn().mockResolvedValue({ settings: {} }) };
    exportSvc = { streamCsvExport: jest.fn().mockResolvedValue({ rowCount: 0, nextCursor: null }) };
    exportJobsSvc = {
      create: jest.fn().mockResolvedValue({
        id: 'job-1',
        format: 'parquet',
        status: 'pending',
        rowCount: 0,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }),
      getStatus: jest.fn(),
      getJobForDownload: jest.fn(),
    };
    exportStorageSvc = { readLocalFile: jest.fn() };
    tenantUnitsSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    hierarchySvc = { findByBuilding: jest.fn().mockResolvedValue([]) };
    concentratorsSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    faultEventsSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    invoicesSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    tariffsSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn(), findBlocks: jest.fn().mockResolvedValue([]) };
    iotReadingsSvc = {
      getLatest: jest.fn(),
      getTimeSeries: jest.fn(),
      getReadings: jest.fn(),
      getAlerts: jest.fn(),
      getStats: jest.fn(),
    };
    integrationsHealthSvc = { getHealth: jest.fn().mockResolvedValue({ integrations: [] }) };

    const module = await Test.createTestingModule({
      controllers: [ExternalApiController],
      providers: [
        { provide: BuildingsService, useValue: buildingsSvc },
        { provide: MetersService, useValue: metersSvc },
        { provide: ReadingsService, useValue: readingsSvc },
        { provide: MeasurementsIngressService, useValue: ingressSvc },
        { provide: AlertsService, useValue: alertsSvc },
        { provide: MeterReadingStatusService, useValue: meterStatusSvc },
        { provide: TenantsService, useValue: tenantsSvc },
        { provide: ReadingsExportService, useValue: exportSvc },
        { provide: DataExportJobsService, useValue: exportJobsSvc },
        { provide: ExportStorageService, useValue: exportStorageSvc },
        { provide: TenantUnitsService, useValue: tenantUnitsSvc },
        { provide: HierarchyService, useValue: hierarchySvc },
        { provide: ConcentratorsService, useValue: concentratorsSvc },
        { provide: FaultEventsService, useValue: faultEventsSvc },
        { provide: InvoicesService, useValue: invoicesSvc },
        { provide: TariffsService, useValue: tariffsSvc },
        { provide: IotReadingsService, useValue: iotReadingsSvc },
        { provide: IntegrationsHealthService, useValue: integrationsHealthSvc },
      ],
    })
      .overrideGuard(DataContractGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(ExternalApiController);
  });

  /* -- Buildings -- */

  it('listBuildings delegates with tenant + buildingIds', async () => {
    await controller.listBuildings(user);
    expect(buildingsSvc.findAll).toHaveBeenCalledWith('t-1', ['b-1']);
  });

  it('getBuilding delegates with id + tenant + buildingIds', async () => {
    const building = {
      id: 'b-1',
      name: 'Test',
      code: 'T1',
      countryCode: 'CL',
      timezone: 'America/Santiago',
      externalSiteId: 'EXT-1',
      siteKind: 'mall',
      regionId: 'reg-1',
      region: { name: 'Chile Central' },
    };
    buildingsSvc.findOne.mockResolvedValue(building);
    const result = await controller.getBuilding('b-1', user);
    expect(buildingsSvc.findOne).toHaveBeenCalledWith('b-1', 't-1', ['b-1']);
    expect(result).toEqual({
      id: 'b-1',
      name: 'Test',
      code: 'T1',
      countryCode: 'CL',
      timezone: 'America/Santiago',
      externalSiteId: 'EXT-1',
      siteKind: 'mall',
      regionId: 'reg-1',
      regionName: 'Chile Central',
    });
  });

  it('listBuildings maps geographic fields for external consumers', async () => {
    buildingsSvc.findAll.mockResolvedValue([
      {
        id: 'b-1',
        name: 'Mall',
        code: 'M1',
        countryCode: 'CL',
        timezone: 'America/Santiago',
        externalSiteId: 'ERP-99',
        siteKind: 'mall',
        regionId: null,
        region: null,
      },
    ]);
    const result = await controller.listBuildings(user);
    expect(result[0]).toMatchObject({
      countryCode: 'CL',
      timezone: 'America/Santiago',
      externalSiteId: 'ERP-99',
    });
  });

  /* -- Meters -- */

  it('listMeters delegates with optional buildingId filter', async () => {
    await controller.listMeters(user, 'b-1');
    expect(metersSvc.findAll).toHaveBeenCalledWith('t-1', ['b-1'], 'b-1');
  });

  it('listMeters without buildingId filter', async () => {
    await controller.listMeters(user, undefined);
    expect(metersSvc.findAll).toHaveBeenCalledWith('t-1', ['b-1'], undefined);
  });

  it('getMeter returns meter status with lag fields', async () => {
    meterStatusSvc.getStatusForMeter.mockResolvedValue({
      meterId: 'm-1',
      lastReadingAt: '2026-01-01T12:00:00.000Z',
      lastIngestedAt: '2026-01-01T12:00:05.000Z',
      lastSource: 'modbus',
      lagSeconds: 120,
      isStale: false,
      staleThresholdHours: 4,
    });
    const result = await controller.getMeterStatus('m-1', user);
    expect(tenantsSvc.findById).toHaveBeenCalledWith('t-1');
    expect(meterStatusSvc.getStatusForMeter).toHaveBeenCalledWith('m-1', 't-1', ['b-1'], {});
    expect(result?.lagSeconds).toBe(120);
    expect(result?.isStale).toBe(false);
  });

  it('getMeter delegates with id and maps external DTO', async () => {
    metersSvc.findOne.mockResolvedValue({
      id: 'm-1',
      buildingId: 'b-1',
      name: 'M1',
      code: 'M1',
      meterType: 'electrical',
      isActive: true,
      externalId: null,
      model: null,
      serialNumber: null,
    });
    const result = await controller.getMeter('m-1', user);
    expect(metersSvc.findOne).toHaveBeenCalledWith('m-1', 't-1', ['b-1']);
    expect(result.id).toBe('m-1');
    expect(result.buildingId).toBe('b-1');
  });

  /* -- Readings -- */

  it('getReadings delegates to findByMeter with timezone-enriched rows', async () => {
    const query = { meterId: 'm-1', from: '2026-01-01', to: '2026-01-31' };
    const enriched = [{
      meter_id: 'm-1',
      timestamp_utc: '2026-01-01T12:00:00.000Z',
      timezone: 'America/Santiago',
      timestamp_local: '2026-01-01T09:00:00',
      quality: 'measured',
    }];
    readingsSvc.findByMeter.mockResolvedValue(enriched);
    const result = await controller.getReadings(user, query as Parameters<typeof controller.getReadings>[1]);
    expect(readingsSvc.findByMeter).toHaveBeenCalledWith('t-1', ['b-1'], query);
    expect(result[0]?.timezone).toBe('America/Santiago');
  });

  it('getLatestReadings delegates to findLatest', async () => {
    const query = { buildingId: 'b-1' };
    await controller.getLatestReadings(user, query as any);
    expect(readingsSvc.findLatest).toHaveBeenCalledWith('t-1', ['b-1'], query);
  });

  it('getAggregatedReadings delegates to findAggregated', async () => {
    const query = { from: '2026-01-01', to: '2026-01-31', interval: 'daily' };
    await controller.getAggregatedReadings(user, query as any);
    expect(readingsSvc.findAggregated).toHaveBeenCalledWith('t-1', ['b-1'], query);
  });

  it('createMeasurement delegates to ingress service and maps response', async () => {
    const dto = {
      meterId: 'm-1',
      timestamp: '2026-06-06T12:00:00.000Z',
      metrics: { powerKw: 5, energyKwhTotal: 100 },
    };
    ingressSvc.create.mockResolvedValue({
      id: 'r-1',
      meter_id: 'm-1',
      timestamp_utc: '2026-06-06T12:00:00.000Z',
      timezone: 'America/Santiago',
      timestamp_local: '2026-06-06T08:00:00',
      power_kw: '5.000',
      energy_kwh_total: '100.000',
      quality: 'measured',
      source: 'api_ingress',
      ingested_at: '2026-06-06T12:00:01.000Z',
    });

    const result = await controller.createMeasurement(user, dto);

    expect(ingressSvc.create).toHaveBeenCalledWith('t-1', ['b-1'], dto);
    expect(result.meterId).toBe('m-1');
    expect(result.source).toBe('api_ingress');
  });

  it('exportReadings delegates to readings export service', async () => {
    const query = {
      format: 'csv' as const,
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T00:00:00.000Z',
    };
    const res = { setHeader: jest.fn(), write: jest.fn(), end: jest.fn() };
    await controller.exportReadings(user, query, 'consumer-1', res as never);
    expect(exportSvc.streamCsvExport).toHaveBeenCalledWith(
      't-1',
      ['b-1'],
      query,
      res,
      'consumer-1',
    );
  });

  it('createExportJob returns accepted job payload', async () => {
    const dto = {
      format: 'parquet' as const,
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T00:00:00.000Z',
    };
    const result = await controller.createExportJob(user, dto);
    expect(exportJobsSvc.create).toHaveBeenCalledWith('t-1', ['b-1'], dto);
    expect(result.id).toBe('job-1');
    expect(result.status).toBe('pending');
  });

  /* -- Alerts -- */

  it('listAlerts delegates with query filters', async () => {
    const query = { status: 'active', severity: 'critical' };
    await controller.listAlerts(user, query as any);
    expect(alertsSvc.findAll).toHaveBeenCalledWith('t-1', ['b-1'], query);
  });

  it('getAlert delegates with id', async () => {
    alertsSvc.findOne.mockResolvedValue({ id: 'a-1' });
    await controller.getAlert('a-1', user);
    expect(alertsSvc.findOne).toHaveBeenCalledWith('a-1', 't-1', ['b-1']);
  });
});
