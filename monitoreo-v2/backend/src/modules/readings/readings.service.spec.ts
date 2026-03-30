import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ReadingsService } from './readings.service';

const TENANT_ID = 'tenant-1';
const METER_ID = 'm-1';
const BUILDING_IDS = ['bld-1'];

describe('ReadingsService', () => {
  let service: ReadingsService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ReadingsService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(ReadingsService);
  });

  describe('findByMeter', () => {
    const baseQuery = {
      meterId: METER_ID,
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
    };

    it('returns empty array when meter not in scope', async () => {
      ds.query.mockResolvedValueOnce([]); // meter scope check

      const result = await service.findByMeter(TENANT_ID, BUILDING_IDS, baseQuery);

      expect(result).toEqual([]);
      expect(ds.query).toHaveBeenCalledTimes(1);
    });

    it('queries raw readings by default', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }]) // meter scope check
        .mockResolvedValueOnce([{ id: 'r-1', power_kw: '10.5' }]);

      const result = await service.findByMeter(TENANT_ID, BUILDING_IDS, baseQuery);

      expect(result).toEqual([{ id: 'r-1', power_kw: '10.5' }]);
      expect(ds.query).toHaveBeenCalledTimes(2);
      // Raw query should use readings table directly
      const rawSql = ds.query.mock.calls[1][0] as string;
      expect(rawSql).toContain('FROM readings');
      expect(rawSql).toContain('ORDER BY timestamp ASC');
    });

    it('uses time_bucket for non-raw resolutions', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([]);

      await service.findByMeter(TENANT_ID, BUILDING_IDS, {
        ...baseQuery,
        resolution: '1h',
      });

      expect(ds.query).toHaveBeenCalledTimes(2);
      const sql = ds.query.mock.calls[1][0] as string;
      expect(sql).toContain('time_bucket');
      expect(ds.query.mock.calls[1][1][0]).toBe('1 hour');
    });

    it('returns empty for invalid resolution', async () => {
      ds.query.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await service.findByMeter(TENANT_ID, BUILDING_IDS, {
        ...baseQuery,
        resolution: 'invalid' as any,
      });

      expect(result).toEqual([]);
    });

    it('respects limit parameter', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([]);

      await service.findByMeter(TENANT_ID, BUILDING_IDS, {
        ...baseQuery,
        limit: 50,
      });

      const params = ds.query.mock.calls[1][1];
      expect(params[3]).toBe(50);
    });

    it('defaults limit to 1000', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([]);

      await service.findByMeter(TENANT_ID, BUILDING_IDS, baseQuery);

      const params = ds.query.mock.calls[1][1];
      expect(params[3]).toBe(1000);
    });

    it('checks meter scope without buildingIds when empty', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([]);

      await service.findByMeter(TENANT_ID, [], baseQuery);

      const scopeSql = ds.query.mock.calls[0][0] as string;
      expect(scopeSql).not.toContain('building_id IN');
    });

    it('checks meter scope with buildingIds', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([]);

      await service.findByMeter(TENANT_ID, ['bld-1', 'bld-2'], baseQuery);

      const scopeSql = ds.query.mock.calls[0][0] as string;
      expect(scopeSql).toContain('building_id IN');
      const scopeParams = ds.query.mock.calls[0][1];
      expect(scopeParams).toContain('bld-1');
      expect(scopeParams).toContain('bld-2');
    });
  });

  describe('findLatest', () => {
    it('returns latest readings for tenant', async () => {
      const rows = [{ meter_id: 'm-1', power_kw: '10.5' }];
      ds.query.mockResolvedValue(rows);

      const result = await service.findLatest(TENANT_ID, [], {});

      expect(result).toEqual(rows);
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('DISTINCT ON (r.meter_id)');
      expect(sql).toContain('m.tenant_id = $1');
    });

    it('scopes by buildingIds when provided', async () => {
      ds.query.mockResolvedValue([]);

      await service.findLatest(TENANT_ID, ['bld-1', 'bld-2'], {});

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.building_id IN');
      const params = ds.query.mock.calls[0][1];
      expect(params).toEqual([TENANT_ID, 'bld-1', 'bld-2']);
    });

    it('filters by buildingId query param', async () => {
      ds.query.mockResolvedValue([]);

      await service.findLatest(TENANT_ID, [], { buildingId: 'bld-x' });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.building_id = $2');
      const params = ds.query.mock.calls[0][1];
      expect(params).toContain('bld-x');
    });

    it('filters by meterId query param', async () => {
      ds.query.mockResolvedValue([]);

      await service.findLatest(TENANT_ID, [], { meterId: 'm-x' });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.id = $2');
      const params = ds.query.mock.calls[0][1];
      expect(params).toContain('m-x');
    });

    it('combines buildingIds scope with buildingId and meterId filters', async () => {
      ds.query.mockResolvedValue([]);

      await service.findLatest(TENANT_ID, ['bld-1'], {
        buildingId: 'bld-1',
        meterId: 'm-1',
      });

      const params = ds.query.mock.calls[0][1];
      expect(params).toEqual([TENANT_ID, 'bld-1', 'bld-1', 'm-1']);
    });
  });

  describe('findAggregated', () => {
    const baseQuery = {
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T23:59:59Z',
      interval: 'daily' as const,
    };

    it('returns aggregated readings with time_bucket', async () => {
      const rows = [{ bucket: '2026-01-01', avg_power_kw: '10.5' }];
      ds.query.mockResolvedValue(rows);

      const result = await service.findAggregated(TENANT_ID, [], baseQuery);

      expect(result).toEqual(rows);
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('time_bucket');
      expect(sql).toContain('AVG(r.power_kw::numeric)');
      expect(sql).toContain('energy_delta_kwh');
      const params = ds.query.mock.calls[0][1];
      expect(params[0]).toBe('1 day');
    });

    it('uses correct interval mapping', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        interval: 'hourly',
      });

      expect(ds.query.mock.calls[0][1][0]).toBe('1 hour');
    });

    it('maps monthly interval', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        interval: 'monthly',
      });

      expect(ds.query.mock.calls[0][1][0]).toBe('1 month');
    });

    it('returns empty for invalid interval', async () => {
      const result = await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        interval: 'invalid',
      });

      expect(result).toEqual([]);
      expect(ds.query).not.toHaveBeenCalled();
    });

    it('scopes by buildingIds', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, ['bld-1'], baseQuery);

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.building_id IN');
    });

    it('filters by buildingId query param', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        buildingId: 'bld-x',
      });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.building_id = $5');
    });

    it('filters by meterId query param', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        meterId: 'm-x',
      });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.id = $5');
    });
  });
});
