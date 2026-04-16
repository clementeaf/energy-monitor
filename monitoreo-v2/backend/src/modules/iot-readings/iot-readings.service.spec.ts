import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { IotReadingsService } from './iot-readings.service';

const TENANT = 't-1';
const METER = 'm-1';
const BIDS = ['b-1'];

describe('IotReadingsService', () => {
  let service: IotReadingsService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn().mockResolvedValue([]) };

    const module = await Test.createTestingModule({
      providers: [
        IotReadingsService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(IotReadingsService);
  });

  describe('getLatest', () => {
    it('queries with tenant scope', async () => {
      await service.getLatest(TENANT, [], undefined);
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('r.tenant_id = $1');
      expect(sql).toContain('DISTINCT ON');
    });

    it('adds buildingIds filter', async () => {
      await service.getLatest(TENANT, BIDS, undefined);
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('m.building_id IN');
    });

    it('adds meterId filter', async () => {
      await service.getLatest(TENANT, [], METER);
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('r.meter_id =');
    });
  });

  describe('getTimeSeries', () => {
    it('returns empty for invalid variables', async () => {
      const result = await service.getTimeSeries(TENANT, [], METER, '2026-01-01', '2026-01-02', ['invalid'], 'raw');
      expect(result).toEqual([]);
    });

    it('queries raw time series', async () => {
      ds.query.mockResolvedValueOnce([{ '?column?': 1 }]); // scope check
      ds.query.mockResolvedValueOnce([{ time: '2026-01-01', variable_name: 'voltage_l1', value: 230 }]);

      await service.getTimeSeries(TENANT, [], METER, '2026-01-01', '2026-01-02', ['voltage_l1'], 'raw');

      const sql = ds.query.mock.calls[1][0] as string;
      expect(sql).toContain("variable_name = ANY($5)");
      expect(sql).not.toContain('time_bucket');
    });

    it('uses time_bucket for hourly resolution', async () => {
      ds.query.mockResolvedValueOnce([{ '?column?': 1 }]);
      ds.query.mockResolvedValueOnce([]);

      await service.getTimeSeries(TENANT, [], METER, '2026-01-01', '2026-01-02', ['voltage_l1'], 'hour');

      const sql = ds.query.mock.calls[1][0] as string;
      expect(sql).toContain('time_bucket');
      expect(ds.query.mock.calls[1][1]).toContain('1 hour');
    });

    it('returns empty for invalid resolution', async () => {
      ds.query.mockResolvedValueOnce([{ '?column?': 1 }]);
      const result = await service.getTimeSeries(TENANT, [], METER, '2026-01-01', '2026-01-02', ['voltage_l1'], 'invalid');
      expect(result).toEqual([]);
    });
  });

  describe('getReadings', () => {
    it('returns pivoted columnar data', async () => {
      ds.query.mockResolvedValueOnce([{ '?column?': 1 }]); // scope check
      ds.query.mockResolvedValueOnce([{ time: '2026-01-01', voltage_l1: 230 }]); // readings
      ds.query.mockResolvedValueOnce([{ total: 1 }]); // count

      // Need to mock Promise.all behavior
      ds.query
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([{ time: '2026-01-01', voltage_l1: 230 }])
        .mockResolvedValueOnce([{ total: 1 }]);

      const result = await service.getReadings(TENANT, [], METER, '2026-01-01', '2026-01-02', 100);

      // Verify FILTER syntax used for pivot
      const readingsSql = ds.query.mock.calls[1]?.[0] as string ?? ds.query.mock.calls[0]?.[0] as string;
      expect(readingsSql).toContain('FILTER');
    });

    it('returns empty when meter not in scope', async () => {
      ds.query.mockResolvedValueOnce([]); // scope check fails
      const result = await service.getReadings(TENANT, BIDS, 'bad-meter', '2026-01-01', '2026-01-02');
      expect(result).toEqual({ rows: [], total: 0 });
    });
  });

  describe('getAlerts', () => {
    it('queries anomalies with tenant scope', async () => {
      await service.getAlerts(TENANT, [], {});
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('r.tenant_id = $1');
      expect(sql).toContain('anomalies');
      expect(sql).toContain('LOW_VOLTAGE');
    });

    it('filters by severity', async () => {
      await service.getAlerts(TENANT, [], { severity: 'HIGH' });
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('severity =');
    });

    it('filters by meterId', async () => {
      await service.getAlerts(TENANT, [], { meterId: METER });
      const sql = ds.query.mock.calls[0][0] as string;
      expect(sql).toContain('r.meter_id =');
    });
  });

  describe('getStats', () => {
    it('returns null when meter not in scope', async () => {
      ds.query.mockResolvedValueOnce([]); // scope check fails
      const result = await service.getStats(TENANT, BIDS, 'bad', '2026-01-01', '2026-01-02');
      expect(result).toBeNull();
    });

    it('returns aggregated stats', async () => {
      ds.query.mockResolvedValueOnce([{ '?column?': 1 }]); // scope check
      ds.query.mockResolvedValueOnce([{ reading_count: 100, avg_voltage: 230 }]);

      const result = await service.getStats(TENANT, [], METER, '2026-01-01', '2026-01-02');
      expect(result).toEqual({ reading_count: 100, avg_voltage: 230 });
    });
  });
});
