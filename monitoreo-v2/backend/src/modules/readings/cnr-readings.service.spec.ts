import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CnrReadingsService } from './cnr-readings.service';
import type { CreateCnrReadingDto } from './dto/create-cnr-reading.dto';

describe('CnrReadingsService', () => {
  let service: CnrReadingsService;
  let ds: { query: jest.Mock };

  const TENANT = 't-1';
  const USER = 'u-1';
  const METER = 'm-1';

  const dto: CreateCnrReadingDto = {
    meterId: METER,
    timestamp: '2026-06-10T14:00:00.000Z',
    metrics: {
      powerKw: 12.5,
      energyKwhTotal: 10450.25,
    },
    reason: 'Falla conectividad 3 días',
  };

  const insertedRow = {
    id: 'r-1',
    meter_id: METER,
    timestamp: '2026-06-10T14:00:00.000Z',
    voltage_l1: null,
    voltage_l2: null,
    voltage_l3: null,
    current_l1: null,
    current_l2: null,
    current_l3: null,
    power_kw: '12.5',
    reactive_power_kvar: null,
    power_factor: null,
    frequency_hz: null,
    energy_kwh_total: '10450.25',
    thd_voltage_pct: null,
    thd_current_pct: null,
    phase_imbalance_pct: null,
    quality: 'estimated',
    source: 'manual_cnr',
    ingested_at: '2026-06-10T14:01:00.000Z',
  };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CnrReadingsService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(CnrReadingsService);
  });

  describe('create', () => {
    it('inserts reading with quality=estimated and source=manual_cnr', async () => {
      // resolveMeterScope
      ds.query.mockResolvedValueOnce([{ tenant_id: TENANT, timezone: 'America/Santiago' }]);
      // INSERT reading
      ds.query.mockResolvedValueOnce([insertedRow]);
      // audit log
      ds.query.mockResolvedValueOnce(undefined);

      const result = await service.create(TENANT, [], USER, dto);

      expect(result.quality).toBe('estimated');
      expect(result.source).toBe('manual_cnr');
      expect(result.power_kw).toBe('12.5');

      // Verify INSERT query uses estimated quality and manual_cnr source
      const insertCall = ds.query.mock.calls[1];
      expect(insertCall[0]).toContain('INSERT INTO readings');
      expect(insertCall[1]).toContain('estimated');
      expect(insertCall[1]).toContain('manual_cnr');
    });

    it('writes audit log with reason and user', async () => {
      ds.query.mockResolvedValueOnce([{ tenant_id: TENANT, timezone: 'UTC' }]);
      ds.query.mockResolvedValueOnce([insertedRow]);
      ds.query.mockResolvedValueOnce(undefined);

      await service.create(TENANT, [], USER, dto);

      const auditCall = ds.query.mock.calls[2];
      expect(auditCall[0]).toContain('INSERT INTO audit_logs');
      expect(auditCall[0]).toContain('CNR_MANUAL_READING');
      expect(auditCall[1][1]).toBe(USER); // user_id
      const details = JSON.parse(auditCall[1][3]);
      expect(details.reason).toBe('Falla conectividad 3 días');
      expect(details.meterId).toBe(METER);
    });

    it('throws NotFoundException for unknown meter', async () => {
      ds.query.mockResolvedValueOnce([]); // meter not in scope
      ds.query.mockResolvedValueOnce([]); // meter doesn't exist at all

      await expect(service.create(TENANT, [], USER, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for meter outside tenant scope', async () => {
      ds.query.mockResolvedValueOnce([]); // not in scope
      ds.query.mockResolvedValueOnce([{ tenant_id: 'other-tenant' }]); // exists elsewhere

      await expect(service.create(TENANT, [], USER, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException for duplicate reading', async () => {
      ds.query.mockResolvedValueOnce([{ tenant_id: TENANT, timezone: 'UTC' }]);
      ds.query.mockRejectedValueOnce({ code: '23505' }); // unique violation

      await expect(service.create(TENANT, [], USER, dto)).rejects.toThrow(ConflictException);
    });

    it('respects building scope', async () => {
      const buildings = ['b-1', 'b-2'];
      ds.query.mockResolvedValueOnce([{ tenant_id: TENANT, timezone: 'UTC' }]);
      ds.query.mockResolvedValueOnce([insertedRow]);
      ds.query.mockResolvedValueOnce(undefined);

      await service.create(TENANT, buildings, USER, dto);

      const scopeCall = ds.query.mock.calls[0];
      expect(scopeCall[0]).toContain('m.building_id IN');
      expect(scopeCall[1]).toContain('b-1');
      expect(scopeCall[1]).toContain('b-2');
    });

    it('includes all optional metrics when provided', async () => {
      const fullDto: CreateCnrReadingDto = {
        ...dto,
        metrics: {
          powerKw: 12.5,
          energyKwhTotal: 10450.25,
          voltageL1: 220.1,
          voltageL2: 219.8,
          voltageL3: 220.4,
          currentL1: 18.2,
          currentL2: 17.9,
          currentL3: 18.5,
          reactivePowerKvar: 2.1,
          powerFactor: 0.95,
          frequencyHz: 50.01,
          thdVoltagePct: 1.8,
          thdCurrentPct: 4.2,
          phaseImbalancePct: 0.5,
        },
        reason: 'CNR completo con todas las métricas',
      };

      ds.query.mockResolvedValueOnce([{ tenant_id: TENANT, timezone: 'UTC' }]);
      ds.query.mockResolvedValueOnce([{ ...insertedRow, voltage_l1: '220.1' }]);
      ds.query.mockResolvedValueOnce(undefined);

      const result = await service.create(TENANT, [], USER, fullDto);
      expect(result).toBeTruthy();

      const insertParams = ds.query.mock.calls[1][1];
      expect(insertParams).toContain(220.1); // voltageL1
      expect(insertParams).toContain(0.95); // powerFactor
    });
  });
});
