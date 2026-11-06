import { describe, expect, it } from 'vitest';
import type { AggregatedReading } from '../../types/reading';
import { sumEnergyDeltaByMeter } from './useReadingsQuery';

const row = (meterId: string, energyDeltaKwh: string | null) =>
  ({ bucket: '2026-07-01T00:00:00Z', meter_id: meterId, energy_delta_kwh: energyDeltaKwh }) as AggregatedReading;

describe('sumEnergyDeltaByMeter', () => {
  it('sums energy deltas per meter across buckets and treats null as zero', () => {
    const energyByMeter = sumEnergyDeltaByMeter([row('m1', '100.5'), row('m2', '40'), row('m1', '20'), row('m2', null)]);
    expect(energyByMeter.get('m1')).toBe(120.5);
    expect(energyByMeter.get('m2')).toBe(40);
    expect(energyByMeter.has('m3')).toBe(false);
  });
});
