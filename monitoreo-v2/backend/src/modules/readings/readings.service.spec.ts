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
        .mockResolvedValueOnce([{ timezone: 'America/Santiago' }]) // meter timezone
        .mockResolvedValueOnce([
          {
            id: 'r-1',
            meter_id: METER_ID,
            timestamp: '2026-01-01T12:00:00.000Z',
            power_kw: '10.5',
            quality: 'measured',
            source: 'modbus',
          },
        ]);

      const result = await service.findByMeter(TENANT_ID, BUILDING_IDS, baseQuery);

      expect(result[0]?.power_kw).toBe('10.5');
      expect(result[0]?.quality).toBe('measured');
      expect(result[0]?.source).toBe('modbus');
      expect(result[0]?.timezone).toBe('America/Santiago');
      expect(result[0]?.timestamp_utc).toBeDefined();
      expect(result[0]?.timestamp_local).toBeDefined();
      expect(ds.query).toHaveBeenCalledTimes(3);
      const rawSql = ds.query.mock.calls[2][0] as string;
      expect(rawSql).toContain('FROM readings');
      expect(rawSql).toContain('quality::text AS quality');
      expect(rawSql).toContain('source');
      expect(rawSql).toContain('ingested_at');
    });

    it('uses time_bucket for non-raw resolutions', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([{ timezone: 'UTC' }])
        .mockResolvedValueOnce([]);

      await service.findByMeter(TENANT_ID, BUILDING_IDS, {
        ...baseQuery,
        resolution: '1h',
      });

      expect(ds.query).toHaveBeenCalledTimes(3);
      const sql = ds.query.mock.calls[2][0] as string;
      expect(sql).toContain('time_bucket');
      expect(ds.query.mock.calls[2][1][0]).toBe('1 hour');
    });

    it('returns empty for invalid resolution', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([{ timezone: 'UTC' }]);

      const result = await service.findByMeter(TENANT_ID, BUILDING_IDS, {
        ...baseQuery,
        resolution: 'invalid' as 'raw',
      });

      expect(result).toEqual([]);
    });

    it('respects limit parameter', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([{ timezone: 'UTC' }])
        .mockResolvedValueOnce([]);

      await service.findByMeter(TENANT_ID, BUILDING_IDS, {
        ...baseQuery,
        limit: 50,
      });

      const params = ds.query.mock.calls[2][1];
      expect(params[3]).toBe(50);
    });

    it('defaults limit to 1000', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([{ timezone: 'UTC' }])
        .mockResolvedValueOnce([]);

      await service.findByMeter(TENANT_ID, BUILDING_IDS, baseQuery);

      const params = ds.query.mock.calls[2][1];
      expect(params[3]).toBe(1000);
    });

    it('checks meter scope without buildingIds when empty', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([{ timezone: 'UTC' }])
        .mockResolvedValueOnce([]);

      await service.findByMeter(TENANT_ID, [], baseQuery);

      const scopeSql = ds.query.mock.calls[0][0] as string;
      expect(scopeSql).not.toContain('building_id IN');
    });

    it('checks meter scope with buildingIds', async () => {
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([{ timezone: 'UTC' }])
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
    it('returns latest readings for tenant with timezone fields', async () => {
      const rows = [{
        meter_id: 'm-1',
        power_kw: '10.5',
        timestamp: '2026-01-01T12:00:00.000Z',
        timezone: 'America/Santiago',
      }];
      ds.query.mockResolvedValue(rows);

      const result = await service.findLatest(TENANT_ID, [], {});

      expect(result[0]?.timezone).toBe('America/Santiago');
      expect(result[0]?.timestamp_utc).toBeDefined();
      expect(result[0]?.timestamp_local).toBeDefined();
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('LEFT JOIN LATERAL');
      expect(sql).toContain('COALESCE(b.timezone, t.timezone');
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
      expect(sql).toContain('m.building_id');
      const params = ds.query.mock.calls[0][1];
      expect(params).toContain('bld-x');
    });

    it('filters by meterId query param', async () => {
      ds.query.mockResolvedValue([]);

      await service.findLatest(TENANT_ID, [], { meterId: 'm-x' });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.id');
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

    it('skips tenant filter in crossTenant mode', async () => {
      ds.query.mockResolvedValue([]);

      await service.findLatest(TENANT_ID, [], {}, true);

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).not.toContain('m.tenant_id = $');
      const params = ds.query.mock.calls[0][1];
      expect(params).toEqual([]);
    });
  });

  describe('findAggregated', () => {
    const baseQuery = {
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T23:59:59Z',
      interval: 'daily' as const,
    };

    it('returns empty for invalid interval', async () => {
      const result = await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        interval: 'invalid',
      });

      expect(result).toEqual([]);
      expect(ds.query).not.toHaveBeenCalled();
    });

    /* --- Continuous aggregate paths --- */

    it('hourly: queries readings_hourly continuous aggregate', async () => {
      const rows = [{ bucket: '2026-01-01T01:00:00', avg_power_kw: '10.5' }];
      ds.query.mockResolvedValue(rows);

      const result = await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        interval: 'hourly',
      });

      expect(result).toEqual(rows);
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('readings_hourly');
      expect(sql).toContain('a.bucket');
      expect(sql).toContain('a.avg_power_kw');
      expect(sql).not.toContain('time_bucket');
    });

    it('daily: queries readings_daily continuous aggregate', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], baseQuery);

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('readings_daily');
      expect(sql).not.toContain('time_bucket');
    });

    it('monthly: re-aggregates readings_daily with time_bucket(1 month)', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        interval: 'monthly',
      });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('readings_daily');
      expect(sql).toContain("time_bucket('1 month'");
      expect(sql).toContain('SUM(a.avg_power_kw * a.reading_count)');
    });

    /* --- Scoping --- */

    it('scopes by tenant in aggregate query', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], baseQuery);

      const params = ds.query.mock.calls[0][1];
      expect(params[0]).toBe(TENANT_ID);
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('a.tenant_id = $1');
    });

    it('scopes by buildingIds in aggregate query', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, ['bld-1'], baseQuery);

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.building_id IN');
      const params = ds.query.mock.calls[0][1];
      expect(params).toContain('bld-1');
    });

    it('filters by buildingId query param in aggregate', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        buildingId: 'bld-x',
      });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.building_id');
      const params = ds.query.mock.calls[0][1];
      expect(params).toContain('bld-x');
    });

    it('filters by meterId query param in aggregate', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        meterId: 'm-x',
      });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('a.meter_id');
      const params = ds.query.mock.calls[0][1];
      expect(params).toContain('m-x');
    });

    it('energy_delta_kwh uses max_energy - min_energy from aggregate', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], baseQuery);

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('max_energy_kwh_total');
      expect(sql).toContain('min_energy_kwh_total');
      expect(sql).toContain('energy_delta_kwh');
    });

    it('15min: uses readings_15min CAGG when range > 7 days', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-31T23:59:59Z',
        interval: '15min',
      });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('readings_15min');
    });

    it('15min: uses raw time_bucket when range <= 7 days', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-05T00:00:00Z',
        interval: '15min',
      });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('time_bucket');
      expect(sql).not.toContain('readings_15min');
      expect(ds.query.mock.calls[0][1][0]).toBe('15 minutes');
    });

    it('portfolio daily: queries portfolio_summary when populated', async () => {
      ds.query.mockResolvedValue([]);

      await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        groupBy: 'portfolio',
      });

      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('portfolio_summary');
      expect(sql).not.toContain('readings_daily');
    });

    it('portfolio daily: falls back to readings_daily when portfolio_summary is unpopulated', async () => {
      const unpopulatedErr = Object.assign(
        new Error('materialized view "portfolio_summary" has not been populated'),
        { driverError: { code: '55000' } },
      );
      const rows = [{ bucket: '2026-01-01', meter_id: '_portfolio', avg_power_kw: '100' }];
      ds.query.mockRejectedValueOnce(unpopulatedErr).mockResolvedValueOnce(rows);

      const result = await service.findAggregated(TENANT_ID, [], {
        ...baseQuery,
        groupBy: 'portfolio',
      });

      expect(result).toEqual(rows);
      expect(ds.query.mock.calls[0][0]).toContain('portfolio_summary');
      expect(ds.query.mock.calls[1][0]).toContain('readings_daily');
      expect(ds.query.mock.calls[1][0]).not.toContain('portfolio_summary');
    });
  });
});
