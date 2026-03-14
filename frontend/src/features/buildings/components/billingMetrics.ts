import type { BillingMonthlySummary } from '../../../types';

export type BillingMetricKey = keyof Pick<
  BillingMonthlySummary,
  | 'totalKwh'
  | 'energiaClp'
  | 'ddaMaxKw'
  | 'ddaMaxPuntaKw'
  | 'kwhTroncal'
  | 'kwhServPublico'
  | 'cargoFijoClp'
  | 'totalNetoClp'
  | 'ivaClp'
  | 'montoExentoClp'
  | 'totalConIvaClp'
>;

interface MetricMeta {
  label: string;
  unit: string;
}

export const billingMetrics: Record<BillingMetricKey, MetricMeta> = {
  totalKwh: { label: 'Consumo (kWh)', unit: 'kWh' },
  energiaClp: { label: 'Energía ($)', unit: 'CLP ($)' },
  ddaMaxKw: { label: 'Dda. máx. (kW)', unit: 'kW' },
  ddaMaxPuntaKw: { label: 'Dda. punta (kW)', unit: 'kW' },
  kwhTroncal: { label: 'kWh troncal', unit: 'kWh' },
  kwhServPublico: { label: 'kWh serv. público', unit: 'kWh' },
  cargoFijoClp: { label: 'Cargo fijo ($)', unit: 'CLP ($)' },
  totalNetoClp: { label: 'Neto ($)', unit: 'CLP ($)' },
  ivaClp: { label: 'IVA ($)', unit: 'CLP ($)' },
  montoExentoClp: { label: 'Exento ($)', unit: 'CLP ($)' },
  totalConIvaClp: { label: 'Total c/IVA ($)', unit: 'CLP ($)' },
};

export const billingMetricKeys = Object.keys(billingMetrics) as BillingMetricKey[];
