import type { Building } from '../../../types/building';
import type { Invoice } from '../../../types/invoice';
import type { LatestReading } from '../../../types/reading';

export interface SelectOption { key: string; label: string }

export const COUNTRY_OPTIONS: SelectOption[] = [
  { key: 'all', label: 'Todos' },
  { key: 'CL', label: 'Chile' },
  { key: 'PE', label: 'Perú' },
  { key: 'CO', label: 'Colombia' },
];

export const PERIODS: SelectOption[] = [
  { key: 'month', label: 'Mes actual' },
  { key: 'quarter', label: 'Trimestre actual' },
  { key: 'year', label: 'Año en curso' },
  { key: '12m', label: 'Últimos 12 meses' },
  { key: 'custom', label: 'Rango personalizado' },
];

export const SORT_TABLE_OPTIONS: SelectOption[] = [
  { key: 'cost_desc', label: 'Costo total desc.' },
  { key: 'cost_asc', label: 'Costo total asc.' },
  { key: 'name', label: 'Nombre A-Z' },
  { key: 'consumption', label: 'Consumo desc.' },
];

export const CURRENCIES: SelectOption[] = [
  { key: 'CLP', label: 'CLP' },
  { key: 'UF', label: 'UF' },
  { key: 'USD', label: 'USD' },
  { key: 'PEN', label: 'PEN' },
  { key: 'COP', label: 'COP' },
];

export const GROUPING_OPTIONS: SelectOption[] = [
  { key: 'mall', label: 'Por mall' },
  { key: 'country', label: 'Por país' },
  { key: 'type', label: 'Por tipología' },
];

export const CURRENCY_RATES: Record<string, number> = {
  CLP: 1,
  UF: 0.0000268,
  USD: 0.00106,
  PEN: 0.00397,
  COP: 4.26,
};

export interface CostRow {
  buildingId: string;
  buildingName: string;
  countryCode: string;
  consumptionMwh: number;
  totalCost: number;
  invoiceCount: number;
  avgPricePerMwh: number;
  variationPct: number | null;
}

export interface MonthlyBucket {
  month: string;
  cost: number;
  mwh: number;
}

export function buildCostRows(
  buildings: Building[],
  invoices: Invoice[],
  readings: LatestReading[],
  currencyRate: number,
): CostRow[] {
  const invoicesByBuilding = new Map<string, Invoice[]>();
  invoices
    .filter((inv) => inv.status !== 'voided')
    .forEach((inv) => {
      const list = invoicesByBuilding.get(inv.buildingId) ?? [];
      list.push(inv);
      invoicesByBuilding.set(inv.buildingId, list);
    });

  const readingsByBuilding = new Map<string, LatestReading[]>();
  readings.forEach((r) => {
    const list = readingsByBuilding.get(r.building_id) ?? [];
    list.push(r);
    readingsByBuilding.set(r.building_id, list);
  });

  return buildings.map((building) => {
    const bInvoices = invoicesByBuilding.get(building.id) ?? [];
    const bReadings = readingsByBuilding.get(building.id) ?? [];
    const totalCostClp = bInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const totalCost = totalCostClp * currencyRate;
    const consumptionMwh = bReadings.reduce((sum, r) => sum + Number(r.energy_kwh_total || 0), 0) / 1000;
    const avgPricePerMwh = consumptionMwh > 0 ? totalCost / consumptionMwh : 0;
    return { buildingId: building.id, buildingName: building.name, countryCode: building.countryCode ?? 'CL', consumptionMwh, totalCost, invoiceCount: bInvoices.length, avgPricePerMwh, variationPct: null };
  });
}

export function aggregateMonthlyCosts(invoices: Invoice[], currencyRate: number): MonthlyBucket[] {
  const buckets = new Map<string, { cost: number; mwh: number }>();
  invoices
    .filter((inv) => inv.status !== 'voided')
    .forEach((inv) => {
      const month = inv.periodStart.slice(0, 7);
      const cost = (parseFloat(inv.total) || 0) * currencyRate;
      const mwh = parseFloat((inv as unknown as Record<string, unknown>).consumptionKwh as string ?? '0') / 1000;
      const prev = buckets.get(month) ?? { cost: 0, mwh: 0 };
      buckets.set(month, { cost: prev.cost + cost, mwh: prev.mwh + mwh });
    });
  return Array.from(buckets.entries())
    .map(([month, v]) => ({ month, cost: v.cost, mwh: v.mwh }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export const FALLBACK_MONTHLY_DATA: MonthlyBucket[] = (() => {
  const now = new Date();
  const MONTHLY_COSTS = [572, 619, 641, 598, 555, 610];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cost = MONTHLY_COSTS[i];
    const mwh = cost / 0.32;
    return { month, cost, mwh };
  });
})();

export const FALLBACK_COST_ROWS: CostRow[] = [
  { buildingId: 'fb-1', buildingName: 'Parque Arauco Kennedy', countryCode: 'CL', consumptionMwh: 4350, totalCost: 1392000, invoiceCount: 6, avgPricePerMwh: 320, variationPct: -3.1 },
  { buildingId: 'fb-2', buildingName: 'Costanera Center', countryCode: 'CL', consumptionMwh: 5600, totalCost: 1792000, invoiceCount: 6, avgPricePerMwh: 320, variationPct: -5.4 },
  { buildingId: 'fb-3', buildingName: 'Mall Plaza Vespucio', countryCode: 'CL', consumptionMwh: 3200, totalCost: 1024000, invoiceCount: 6, avgPricePerMwh: 320, variationPct: 1.8 },
  { buildingId: 'fb-4', buildingName: 'Parque Arauco La Reina', countryCode: 'CL', consumptionMwh: 2250, totalCost: 720000, invoiceCount: 6, avgPricePerMwh: 320, variationPct: 2.2 },
  { buildingId: 'fb-5', buildingName: 'Mall Sport', countryCode: 'CL', consumptionMwh: 1900, totalCost: 608000, invoiceCount: 6, avgPricePerMwh: 320, variationPct: -1.7 },
];

export function formatCurrency(value: number, currency: string): string {
  const FORMAT: Record<string, Intl.NumberFormatOptions> = {
    CLP: { style: 'decimal', maximumFractionDigits: 0 },
    UF: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
    USD: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  };
  const opts = FORMAT[currency] ?? FORMAT.CLP;
  return `${new Intl.NumberFormat('es-CL', opts).format(value)} ${currency}`;
}

export function downloadCsv(rows: CostRow[], currency: string) {
  const header = 'Centro,MWh,Precio medio,Costo total,Facturas,Variación %';
  const csv = [header, ...rows.map((r) =>
    `${r.buildingName},${r.consumptionMwh.toFixed(1)},${r.avgPricePerMwh.toFixed(2)},${r.totalCost.toFixed(2)},${r.invoiceCount},${r.variationPct ?? '—'}`,
  )].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `costos_${currency}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
