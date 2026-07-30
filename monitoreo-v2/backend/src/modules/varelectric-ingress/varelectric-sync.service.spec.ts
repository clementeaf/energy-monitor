import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { VarelectricSyncService, VarelectricSyncSource } from './varelectric-sync.service';

describe('VarelectricSyncService', () => {
  let service: VarelectricSyncService;
  let ds: { query: jest.Mock };
  let configService: { get: jest.Mock };

  const SOURCES: VarelectricSyncSource[] = [
    { db: 'quilicura', buildingId: 'b-quil', tenantId: 't-1' },
    { db: 'renaissance', buildingId: 'b-ren', tenantId: 't-1' },
  ];

  beforeEach(async () => {
    ds = { query: jest.fn().mockResolvedValue([]) };
    configService = { get: jest.fn().mockReturnValue('localhost') };

    const module = await Test.createTestingModule({
      providers: [
        VarelectricSyncService,
        { provide: DataSource, useValue: ds },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(VarelectricSyncService);
  });

  describe('mapTagsToReadings', () => {
    it('maps var_electric tags to readings columns', () => {
      const row = {
        id_remarcador: 10,
        fecha: '2025-05-20 20:45:01',
        tag1: 230, tag2: 233, tag3: 233,
        tag4: 232.8, tag5: 192.9, tag6: 219.6,
        tag9: 127.2, tag12: 0.87, tag14: 4035,
      };

      const mapped = VarelectricSyncService.mapTagsToReadings(row);

      expect(mapped.voltage_l1).toBe(230);
      expect(mapped.voltage_l2).toBe(233);
      expect(mapped.voltage_l3).toBe(233);
      expect(mapped.current_l1).toBe(232.8);
      expect(mapped.current_l2).toBe(192.9);
      expect(mapped.current_l3).toBe(219.6);
      expect(mapped.power_kw).toBe(127.2);
      expect(mapped.power_factor).toBe(0.87);
      expect(mapped.energy_kwh_total).toBe(4035);
    });

    it('returns null for missing tags', () => {
      const row = { id_remarcador: 10, fecha: '2025-01-01', tag1: 230 };

      const mapped = VarelectricSyncService.mapTagsToReadings(row);

      expect(mapped.voltage_l1).toBe(230);
      expect(mapped.power_kw).toBeNull();
      expect(mapped.energy_kwh_total).toBeNull();
    });

    it('skips rows without power_kw (tag9)', () => {
      const row = { id_remarcador: 10, fecha: '2025-01-01', tag1: 230 };
      expect(VarelectricSyncService.shouldSkipRow(row)).toBe(true);
    });

    it('keeps rows with power_kw', () => {
      const row = { id_remarcador: 10, fecha: '2025-01-01', tag9: 100 };
      expect(VarelectricSyncService.shouldSkipRow(row)).toBe(false);
    });
  });

  describe('resolveMeterId', () => {
    it('finds meter_id by building and id_remarcador', async () => {
      ds.query.mockResolvedValueOnce([{ id: 'meter-123' }]);

      const meterId = await service.resolveMeterId('b-quil', 10);

      expect(meterId).toBe('meter-123');
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('id_remarcador'),
        expect.arrayContaining(['b-quil', '10']),
      );
    });

    it('returns null for unknown remarcador', async () => {
      ds.query.mockResolvedValueOnce([]);
      const meterId = await service.resolveMeterId('b-quil', 999);
      expect(meterId).toBeNull();
    });

    it('caches meter_id lookups', async () => {
      ds.query.mockResolvedValueOnce([{ id: 'meter-123' }]);

      await service.resolveMeterId('b-quil', 10);
      await service.resolveMeterId('b-quil', 10);

      expect(ds.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshMaterializedViews', () => {
    it('refreshes all 4 materialized views after sync', async () => {
      ds.query.mockResolvedValue([]);

      await service.refreshMaterializedViews();

      const calls = ds.query.mock.calls.map((c: unknown[]) => (c[0] as string).trim());
      expect(calls).toContainEqual(expect.stringContaining('REFRESH MATERIALIZED VIEW readings_hourly'));
      expect(calls).toContainEqual(expect.stringContaining('REFRESH MATERIALIZED VIEW readings_daily'));
      expect(calls).toContainEqual(expect.stringContaining('REFRESH MATERIALIZED VIEW portfolio_summary'));
      expect(calls).toContainEqual(expect.stringContaining('REFRESH MATERIALIZED VIEW building_summary'));
    });
  });
});
