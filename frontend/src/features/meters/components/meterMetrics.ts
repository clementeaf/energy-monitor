import type { MeterMonthly } from '../../../types';

export type MeterMetricKey = keyof Pick<
  MeterMonthly,
  | 'totalKwh'
  | 'avgPowerKw'
  | 'peakPowerKw'
  | 'totalReactiveKvar'
  | 'avgPowerFactor'
>;

interface MetricMeta {
  label: string;
  unit: string;
}

export const meterMetrics: Record<MeterMetricKey, MetricMeta> = {
  totalKwh: { label: 'Consumo (kWh)', unit: 'kWh' },
  avgPowerKw: { label: 'Potencia Activa prom. (kW)', unit: 'kW' },
  peakPowerKw: { label: 'Potencia Activa peak (kW)', unit: 'kW' },
  totalReactiveKvar: { label: 'Reactiva (kVAr)', unit: 'kVAr' },
  avgPowerFactor: { label: 'Factor potencia', unit: '' },
};

export const meterMetricKeys = Object.keys(meterMetrics) as MeterMetricKey[];
