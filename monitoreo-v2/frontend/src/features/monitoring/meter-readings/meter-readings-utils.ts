import type { Reading, ReadingQuality } from '../../../types/reading';

export type ReadingMetricField =
  | 'voltage_l1' | 'voltage_l2' | 'voltage_l3'
  | 'current_l1' | 'current_l2' | 'current_l3'
  | 'power_kw' | 'reactive_power_kvar' | 'power_factor' | 'frequency_hz'
  | 'energy_kwh_total' | 'thd_voltage_pct' | 'thd_current_pct' | 'phase_imbalance_pct';

export interface MetricMeta { label: string; unit: string }

export const READING_METRICS: Record<ReadingMetricField, MetricMeta> = {
  voltage_l1:          { label: 'Voltaje L1', unit: 'V' },
  voltage_l2:          { label: 'Voltaje L2', unit: 'V' },
  voltage_l3:          { label: 'Voltaje L3', unit: 'V' },
  current_l1:          { label: 'Corriente L1', unit: 'A' },
  current_l2:          { label: 'Corriente L2', unit: 'A' },
  current_l3:          { label: 'Corriente L3', unit: 'A' },
  power_kw:            { label: 'Potencia Activa', unit: 'kW' },
  reactive_power_kvar: { label: 'Potencia Reactiva', unit: 'kVAr' },
  power_factor:        { label: 'Factor de Potencia', unit: '' },
  frequency_hz:        { label: 'Frecuencia', unit: 'Hz' },
  energy_kwh_total:    { label: 'Energia Acumulada', unit: 'kWh' },
  thd_voltage_pct:     { label: 'THD Voltaje', unit: '%' },
  thd_current_pct:     { label: 'THD Corriente', unit: '%' },
  phase_imbalance_pct: { label: 'Desbalance de Fase', unit: '%' },
};

export type CompositeKey = 'voltage' | 'current';
export type SelectorKey = ReadingMetricField | CompositeKey;

export const COMPOSITES: Record<CompositeKey, { label: string; unit: string; keys: [ReadingMetricField, ReadingMetricField, ReadingMetricField] }> = {
  voltage: { label: 'Voltaje', unit: 'V', keys: ['voltage_l1', 'voltage_l2', 'voltage_l3'] },
  current: { label: 'Corriente', unit: 'A', keys: ['current_l1', 'current_l2', 'current_l3'] },
};

export const SELECTOR_ITEMS: { key: SelectorKey; label: string }[] = [
  { key: 'power_kw', label: 'Potencia Activa' },
  { key: 'voltage', label: 'Voltaje' },
  { key: 'current', label: 'Corriente' },
  { key: 'reactive_power_kvar', label: 'Potencia Reactiva' },
  { key: 'power_factor', label: 'Factor de Potencia' },
  { key: 'frequency_hz', label: 'Frecuencia' },
  { key: 'energy_kwh_total', label: 'Energia Acumulada' },
];

export const PHASE_COLORS = ['#374151', '#2563eb', '#f59e0b'] as const;
export const PHASE_LABELS = ['L1', 'L2', 'L3'] as const;

export function isComposite(k: SelectorKey): k is CompositeKey {
  return k === 'voltage' || k === 'current';
}

export function parseVal(v: string | null): number | null {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export function avgNonNull(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
}

export function maxNonNull(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length > 0 ? Math.max(...nums) : null;
}

export function groupByHour(readings: Reading[], field: ReadingMetricField): [number, number | null][] {
  const groups = new Map<number, (number | null)[]>();
  for (const r of readings) {
    const d = new Date(r.timestamp);
    const hourTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
    const arr = groups.get(hourTs);
    const val = parseVal(r[field]);
    if (arr) arr.push(val); else groups.set(hourTs, [val]);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, vals]) => [ts, avgNonNull(vals)]);
}

export interface DaySummary {
  day: string;
  label: string;
  count: number;
  alertCount: number;
  avgPowerKw: number | null;
  peakPowerKw: number | null;
  avgPowerFactor: number | null;
  avgVoltageL1: number | null;
  avgVoltageL2: number | null;
  avgVoltageL3: number | null;
  avgCurrentL1: number | null;
  avgCurrentL2: number | null;
  avgCurrentL3: number | null;
  avgReactivePowerKvar: number | null;
  avgFrequencyHz: number | null;
  dominantQuality: ReadingQuality;
  primarySource: string | null;
}

function dominantQualityForRows(rows: Reading[]): ReadingQuality {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const q = (row.quality ?? 'unknown') as string;
    counts.set(q, (counts.get(q) ?? 0) + 1);
  }
  let best: ReadingQuality = 'unknown';
  let bestCount = 0;
  for (const [q, count] of counts) {
    if (count > bestCount) { bestCount = count; best = q as ReadingQuality; }
  }
  return best;
}

export function groupByDay(readings: Reading[], alertTimestamps: string[]): DaySummary[] {
  const groups = new Map<string, Reading[]>();
  for (const r of readings) {
    const day = r.timestamp.slice(0, 10);
    const arr = groups.get(day);
    if (arr) arr.push(r); else groups.set(day, [r]);
  }
  const alertsByDay = new Map<string, number>();
  for (const ts of alertTimestamps) {
    const day = ts.slice(0, 10);
    alertsByDay.set(day, (alertsByDay.get(day) ?? 0) + 1);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, rows]) => ({
      day,
      label: day.slice(8, 10),
      count: rows.length,
      alertCount: alertsByDay.get(day) ?? 0,
      avgPowerKw: avgNonNull(rows.map((r) => parseVal(r.power_kw))),
      peakPowerKw: maxNonNull(rows.map((r) => parseVal(r.power_kw))),
      avgPowerFactor: avgNonNull(rows.map((r) => parseVal(r.power_factor))),
      avgVoltageL1: avgNonNull(rows.map((r) => parseVal(r.voltage_l1))),
      avgVoltageL2: avgNonNull(rows.map((r) => parseVal(r.voltage_l2))),
      avgVoltageL3: avgNonNull(rows.map((r) => parseVal(r.voltage_l3))),
      avgCurrentL1: avgNonNull(rows.map((r) => parseVal(r.current_l1))),
      avgCurrentL2: avgNonNull(rows.map((r) => parseVal(r.current_l2))),
      avgCurrentL3: avgNonNull(rows.map((r) => parseVal(r.current_l3))),
      avgReactivePowerKvar: avgNonNull(rows.map((r) => parseVal(r.reactive_power_kvar))),
      avgFrequencyHz: avgNonNull(rows.map((r) => parseVal(r.frequency_hz))),
      dominantQuality: dominantQualityForRows(rows),
      primarySource: rows.find((r) => r.source)?.source ?? null,
    }));
}
