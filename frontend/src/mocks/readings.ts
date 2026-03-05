import type { Reading, ConsumptionPoint } from '../types';

function generateHourlyReadings(meterId: string, days: number): Reading[] {
  const readings: Reading[] = [];
  const start = new Date('2026-01-01T00:00:00Z');
  const is3P = ['M001', 'M002', 'M003', 'M011', 'M012', 'M013'].includes(meterId);
  const basePower = is3P ? 2.2 + Math.random() * 0.5 : 0.8 + Math.random() * 0.3;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      const ts = new Date(start);
      ts.setDate(ts.getDate() + d);
      ts.setHours(h);
      const hourFactor = h >= 8 && h <= 20 ? 1.2 : 0.7;
      const power = basePower * hourFactor * (0.9 + Math.random() * 0.2);

      readings.push({
        timestamp: ts.toISOString(),
        voltageL1: is3P ? 229 + Math.random() * 3 : 229 + Math.random() * 3,
        voltageL2: is3P ? 229 + Math.random() * 3 : null,
        voltageL3: is3P ? 229 + Math.random() * 3 : null,
        currentL1: 10 + Math.random() * 2,
        currentL2: is3P ? 10 + Math.random() * 2 : null,
        currentL3: is3P ? 10 + Math.random() * 2 : null,
        powerKw: Number(power.toFixed(3)),
        reactivePowerKvar: Number((power * 0.4 * Math.random()).toFixed(3)),
        powerFactor: Number((0.85 + Math.random() * 0.15).toFixed(3)),
        frequencyHz: Number((49.95 + Math.random() * 0.1).toFixed(3)),
        energyKwhTotal: Number((basePower * 24 * (d + h / 24)).toFixed(3)),
        thdVoltagePct: null,
        thdCurrentPct: null,
        phaseImbalancePct: null,
      });
    }
  }
  return readings;
}

export const readingsByMeter: Record<string, Reading[]> = {};
const meterIds = ['M001', 'M002', 'M003', 'M004', 'M005', 'M006', 'M007', 'M008', 'M009', 'M010', 'M011', 'M012', 'M013', 'M014', 'M015'];
for (const id of meterIds) {
  readingsByMeter[id] = generateHourlyReadings(id, 60);
}

export function getDailyConsumption(buildingId: string): ConsumptionPoint[] {
  const buildingMeters = buildingId === 'pac4220'
    ? ['M001', 'M002', 'M004', 'M005', 'M008', 'M009', 'M012', 'M014']
    : ['M003', 'M006', 'M007', 'M010', 'M011', 'M013', 'M015'];

  const dailyMap = new Map<string, { sum: number; max: number; count: number; energy: number }>();

  for (const mid of buildingMeters) {
    for (const r of readingsByMeter[mid] ?? []) {
      const day = r.timestamp.slice(0, 10);
      const entry = dailyMap.get(day) ?? { sum: 0, max: 0, count: 0, energy: 0 };
      entry.sum += r.powerKw;
      entry.max = Math.max(entry.max, r.powerKw);
      entry.count++;
      entry.energy += r.powerKw * 0.25; // 15-min interval → kWh
      dailyMap.set(day, entry);
    }
  }

  return Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, d]) => ({
      timestamp: `${day}T00:00:00Z`,
      totalPowerKw: Number(d.sum.toFixed(3)),
      avgPowerKw: Number((d.sum / d.count).toFixed(3)),
      peakPowerKw: Number(d.max.toFixed(3)),
    }));
}
