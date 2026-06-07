import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MeasurementsIngressService } from './measurements-ingress.service';
import type { CreateMeasurementDto } from './dto/create-measurement.dto';

const TENANT_ID = 'tenant-1';
const METER_ID = 'm-1';
const BUILDING_IDS = ['bld-1'];

const baseDto: CreateMeasurementDto = {
  meterId: METER_ID,
  timestamp: '2026-06-06T12:00:00.000Z',
  metrics: {
    powerKw: 10.5,
    energyKwhTotal: 1000,
  },
  quality: 'measured',
};

describe('MeasurementsIngressService', () => {
  let service: MeasurementsIngressService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MeasurementsIngressService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(MeasurementsIngressService);
  });

  it('inserts measurement with api_ingress source and enriches timezone', async () => {
    ds.query
      .mockResolvedValueOnce([{ tenant_id: TENANT_ID, timezone: 'America/Santiago' }])
      .mockResolvedValueOnce([
        {
          id: 'r-1',
          meter_id: METER_ID,
          timestamp: '2026-06-06T12:00:00.000Z',
          voltage_l1: null,
          voltage_l2: null,
          voltage_l3: null,
          current_l1: null,
          current_l2: null,
          current_l3: null,
          power_kw: '10.500',
          reactive_power_kvar: null,
          power_factor: null,
          frequency_hz: null,
          energy_kwh_total: '1000.000',
          thd_voltage_pct: null,
          thd_current_pct: null,
          phase_imbalance_pct: null,
          quality: 'measured',
          source: 'api_ingress',
          ingested_at: '2026-06-06T12:00:01.000Z',
        },
      ]);

    const result = await service.create(TENANT_ID, BUILDING_IDS, baseDto);

    expect(result.source).toBe('api_ingress');
    expect(result.quality).toBe('measured');
    expect(result.timezone).toBe('America/Santiago');
    const insertSql = ds.query.mock.calls[1][0] as string;
    const insertParams = ds.query.mock.calls[1][1] as unknown[];
    expect(insertSql).toContain('INSERT INTO readings');
    expect(insertParams).toContain('api_ingress');
  });

  it('throws NotFoundException when meter does not exist', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(service.create(TENANT_ID, BUILDING_IDS, baseDto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when meter is outside API key scope', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ tenant_id: 'other-tenant' }]);

    await expect(service.create(TENANT_ID, BUILDING_IDS, baseDto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ConflictException on duplicate unique key', async () => {
    ds.query
      .mockResolvedValueOnce([{ tenant_id: TENANT_ID, timezone: 'UTC' }])
      .mockRejectedValueOnce({ code: '23505' });

    await expect(service.create(TENANT_ID, BUILDING_IDS, baseDto)).rejects.toThrow(
      ConflictException,
    );
  });
});
