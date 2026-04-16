import { describe, it, expect } from 'vitest';
import {
  dateRangeFromPreset,
  previousPeriodRange,
  aggregatePortfolioByBucket,
  sumEnergyByBuilding,
  rankBuildingsByIntensity,
  dailyEnergySeriesByBuilding,
  compareMetricsByBuilding,
  meterToBuildingMap,
  countMetersByBuilding,
} from './dashboardAggregations';
import type { AggregatedReading } from '../../types/reading';
import type { Building } from '../../types/building';
import type { Meter } from '../../types/meter';

const makeRow = (overrides: Partial<AggregatedReading> = {}): AggregatedReading => ({
  bucket: '2026-01-01T00:00:00Z',
  meter_id: 'm-1',
  avg_power_kw: '10',
  max_power_kw: '15',
  min_power_kw: '5',
  avg_power_factor: '0.95',
  avg_voltage_l1: '220',
  energy_delta_kwh: '100',
  reading_count: '12',
  ...overrides,
});

describe('dateRangeFromPreset', () => {
  const now = new Date('2026-04-15T12:00:00Z');

  it('returns 7-day range', () => {
    const { from, to } = dateRangeFromPreset('7d', now);
    expect(new Date(to).getTime() - new Date(from).getTime()).toBeCloseTo(7 * 86400000, -3);
  });

  it('returns ~30-day range', () => {
    const { from, to } = dateRangeFromPreset('30d', now);
    const diffDays = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
    expect(diffDays).toBeGreaterThanOrEqual(29.9);
    expect(diffDays).toBeLessThanOrEqual(30.1);
  });

  it('returns ~90-day range', () => {
    const { from, to } = dateRangeFromPreset('90d', now);
    const diffDays = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
    expect(diffDays).toBeGreaterThanOrEqual(89.9);
    expect(diffDays).toBeLessThanOrEqual(90.1);
  });
});

describe('previousPeriodRange', () => {
  it('returns prior period of same duration ending 1ms before current start', () => {
    const prev = previousPeriodRange('2026-04-08T00:00:00Z', '2026-04-15T00:00:00Z');
    // Duration is 7 days. prev.to = Apr 7 23:59:59.999, prev.from = Mar 31 23:59:59.998
    expect(new Date(prev.to).getTime()).toBe(new Date('2026-04-08T00:00:00Z').getTime() - 1);
    const durationMs = new Date(prev.to).getTime() - new Date(prev.from).getTime();
    expect(durationMs).toBe(7 * 86400000); // same 7-day duration
  });
});

describe('aggregatePortfolioByBucket', () => {
  it('sums energy and demand by bucket across meters', () => {
    const rows = [
      makeRow({ bucket: '2026-01-01', meter_id: 'm-1', energy_delta_kwh: '100', avg_power_kw: '10' }),
      makeRow({ bucket: '2026-01-01', meter_id: 'm-2', energy_delta_kwh: '200', avg_power_kw: '20' }),
      makeRow({ bucket: '2026-01-02', meter_id: 'm-1', energy_delta_kwh: '50', avg_power_kw: '5' }),
    ];
    const result = aggregatePortfolioByBucket(rows);
    expect(result).toHaveLength(2);
    expect(result[0].energyKwh).toBe(300);
    expect(result[0].demandKw).toBe(30);
    expect(result[1].energyKwh).toBe(50);
  });

  it('returns empty for empty input', () => {
    expect(aggregatePortfolioByBucket([])).toEqual([]);
  });

  it('sorts by bucket ascending', () => {
    const rows = [
      makeRow({ bucket: '2026-01-03' }),
      makeRow({ bucket: '2026-01-01' }),
      makeRow({ bucket: '2026-01-02' }),
    ];
    const result = aggregatePortfolioByBucket(rows);
    expect(result.map((r) => r.bucket)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });
});

describe('sumEnergyByBuilding', () => {
  it('sums energy per building via meter map', () => {
    const meterMap = new Map([['m-1', 'b-1'], ['m-2', 'b-1'], ['m-3', 'b-2']]);
    const rows = [
      makeRow({ meter_id: 'm-1', energy_delta_kwh: '100' }),
      makeRow({ meter_id: 'm-2', energy_delta_kwh: '200' }),
      makeRow({ meter_id: 'm-3', energy_delta_kwh: '50' }),
    ];
    const result = sumEnergyByBuilding(rows, meterMap);
    expect(result.get('b-1')).toBe(300);
    expect(result.get('b-2')).toBe(50);
  });

  it('ignores meters not in map', () => {
    const result = sumEnergyByBuilding([makeRow({ meter_id: 'unknown' })], new Map());
    expect(result.size).toBe(0);
  });
});

describe('rankBuildingsByIntensity', () => {
  it('ranks by kWh/m² when area is available', () => {
    const energy = new Map([['b-1', 1000], ['b-2', 500]]);
    const buildings: Building[] = [
      { id: 'b-1', name: 'Big', areaSqm: '100' } as Building,
      { id: 'b-2', name: 'Small', areaSqm: '50' } as Building,
    ];
    const meters = new Map([['b-1', 5], ['b-2', 3]]);
    const result = rankBuildingsByIntensity(energy, buildings, meters);
    expect(result[0].intensityUnit).toBe('kWh/m²');
    expect(result[0].intensity).toBe(10); // 1000/100 and 500/50 both = 10
  });

  it('uses kWh/medidor when no area', () => {
    const energy = new Map([['b-1', 100]]);
    const buildings: Building[] = [
      { id: 'b-1', name: 'NoArea', areaSqm: null } as Building,
    ];
    const meters = new Map([['b-1', 5]]);
    const result = rankBuildingsByIntensity(energy, buildings, meters);
    expect(result[0].intensityUnit).toBe('kWh/medidor');
    expect(result[0].intensity).toBe(20); // 100/5
  });
});

describe('meterToBuildingMap', () => {
  it('creates meter→building map', () => {
    const meters = [
      { id: 'm-1', buildingId: 'b-1' },
      { id: 'm-2', buildingId: 'b-2' },
    ] as Meter[];
    const result = meterToBuildingMap(meters);
    expect(result.get('m-1')).toBe('b-1');
    expect(result.get('m-2')).toBe('b-2');
  });
});

describe('countMetersByBuilding', () => {
  it('counts meters per building', () => {
    const meters = [
      { id: 'm-1', buildingId: 'b-1' },
      { id: 'm-2', buildingId: 'b-1' },
      { id: 'm-3', buildingId: 'b-2' },
    ] as Meter[];
    const result = countMetersByBuilding(meters);
    expect(result.get('b-1')).toBe(2);
    expect(result.get('b-2')).toBe(1);
  });
});

describe('dailyEnergySeriesByBuilding', () => {
  it('groups energy by building and day', () => {
    const meterMap = new Map([['m-1', 'b-1'], ['m-2', 'b-1']]);
    const rows = [
      makeRow({ bucket: '2026-01-01', meter_id: 'm-1', energy_delta_kwh: '100' }),
      makeRow({ bucket: '2026-01-01', meter_id: 'm-2', energy_delta_kwh: '50' }),
      makeRow({ bucket: '2026-01-02', meter_id: 'm-1', energy_delta_kwh: '80' }),
    ];
    const result = dailyEnergySeriesByBuilding(rows, meterMap, ['b-1']);
    const series = result.get('b-1')!;
    expect(series).toHaveLength(2);
    expect(series[0][1]).toBe(150); // day 1: 100+50
    expect(series[1][1]).toBe(80);  // day 2: 80
  });

  it('excludes buildings not in buildingIds', () => {
    const meterMap = new Map([['m-1', 'b-1']]);
    const rows = [makeRow({ meter_id: 'm-1' })];
    const result = dailyEnergySeriesByBuilding(rows, meterMap, ['b-2']);
    expect(result.get('b-2')!).toHaveLength(0);
  });
});

describe('compareMetricsByBuilding', () => {
  it('computes energy, peak demand, avg PF per building', () => {
    const meterMap = new Map([['m-1', 'b-1']]);
    const rows = [
      makeRow({ bucket: '2026-01-01', meter_id: 'm-1', energy_delta_kwh: '100', avg_power_kw: '50', avg_power_factor: '0.9' }),
      makeRow({ bucket: '2026-01-02', meter_id: 'm-1', energy_delta_kwh: '200', avg_power_kw: '80', avg_power_factor: '0.95' }),
    ];
    const result = compareMetricsByBuilding(rows, meterMap, ['b-1']);
    const b1 = result.get('b-1')!;
    expect(b1.energyKwh).toBe(300);
    expect(b1.peakDemandKw).toBe(80);
    expect(b1.avgPf).toBeCloseTo(0.925, 2);
  });
});
