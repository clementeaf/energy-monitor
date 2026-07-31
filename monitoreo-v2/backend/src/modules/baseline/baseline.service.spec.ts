import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BaselineService } from './baseline.service';

const TENANT_ID = 'tenant-1';
const BUILDING_IDS = ['bld-1'];

describe('BaselineService', () => {
  let service: BaselineService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        BaselineService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(BaselineService);
  });

  describe('computeDeviationPct', () => {
    it('returns 0 when actual equals expected', () => {
      expect(BaselineService.deviationPct(100, 100)).toBe(0);
    });

    it('returns positive pct when actual exceeds expected', () => {
      expect(BaselineService.deviationPct(150, 100)).toBe(50);
    });

    it('returns negative pct when actual is below expected', () => {
      expect(BaselineService.deviationPct(70, 100)).toBe(-30);
    });

    it('returns null when expected is 0', () => {
      expect(BaselineService.deviationPct(50, 0)).toBeNull();
    });
  });

  describe('getHourlyBaseline', () => {
    it('returns hourly actual vs expected for a building', async () => {
      ds.query.mockResolvedValueOnce([
        { hour: '2026-01-15 10:00', actual_kwh: '120.5', baseline_kwh: '100.0' },
        { hour: '2026-01-15 11:00', actual_kwh: '95.0', baseline_kwh: '105.0' },
        { hour: '2026-01-15 12:00', actual_kwh: '130.0', baseline_kwh: '110.0' },
      ]);

      const result = await service.getHourlyBaseline(TENANT_ID, BUILDING_IDS, {
        from: '2026-01-15',
        to: '2026-01-16',
        buildingId: 'bld-1',
      });

      expect(result).toHaveLength(3);
      expect(result[0].hour).toBe('2026-01-15 10:00');
      expect(result[0].actualKwh).toBe(120.5);
      expect(result[0].baselineKwh).toBe(100);
      expect(result[0].deviationPct).toBeCloseTo(20.5, 1);
      expect(result[1].deviationPct).toBeCloseTo(-9.52, 1);
    });
  });

  describe('getDailyBaseline', () => {
    it('returns daily actual vs expected for a building', async () => {
      ds.query.mockResolvedValueOnce([
        { day: '2026-01-15', actual_kwh: '2400.0', baseline_kwh: '2200.0' },
        { day: '2026-01-16', actual_kwh: '2100.0', baseline_kwh: '2200.0' },
      ]);

      const result = await service.getDailyBaseline(TENANT_ID, BUILDING_IDS, {
        from: '2026-01-15',
        to: '2026-01-17',
        buildingId: 'bld-1',
      });

      expect(result).toHaveLength(2);
      expect(result[0].day).toBe('2026-01-15');
      expect(result[0].actualKwh).toBe(2400);
      expect(result[0].baselineKwh).toBe(2200);
      expect(result[0].deviationPct).toBeCloseTo(9.09, 1);
    });
  });

  describe('getBaselineSummary', () => {
    it('returns aggregated deviation summary', async () => {
      ds.query.mockResolvedValueOnce([
        { total_actual_kwh: '15000.0', total_baseline_kwh: '14000.0', days_count: '7' },
      ]);

      const result = await service.getBaselineSummary(TENANT_ID, BUILDING_IDS, {
        from: '2026-01-15',
        to: '2026-01-22',
        buildingId: 'bld-1',
      });

      expect(result.totalActualKwh).toBe(15000);
      expect(result.totalBaselineKwh).toBe(14000);
      expect(result.deviationPct).toBeCloseTo(7.14, 1);
      expect(result.daysCount).toBe(7);
    });

    it('handles zero baseline gracefully', async () => {
      ds.query.mockResolvedValueOnce([
        { total_actual_kwh: '0', total_baseline_kwh: '0', days_count: '0' },
      ]);

      const result = await service.getBaselineSummary(TENANT_ID, BUILDING_IDS, {
        from: '2026-01-15',
        to: '2026-01-22',
        buildingId: 'bld-1',
      });

      expect(result.deviationPct).toBeNull();
    });
  });
});
