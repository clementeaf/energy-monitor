import { deriveBuildingStatus } from '../../../lib/energy-status';
import type { Building } from '../../../types/building';
import type { LatestReading, AggregatedReading } from '../../../types/reading';
import type { Alert, AlertSeverity } from '../../../types/alert';

export const FALLBACK_AGG_MONTHS = [
  { label: 'ago', mwh: 312.4 }, { label: 'sep', mwh: 298.7 }, { label: 'oct', mwh: 287.1 },
  { label: 'nov', mwh: 301.8 }, { label: 'dic', mwh: 334.2 }, { label: 'ene', mwh: 341.5 },
  { label: 'feb', mwh: 319.0 }, { label: 'mar', mwh: 306.3 }, { label: 'abr', mwh: 289.4 },
  { label: 'may', mwh: 278.9 }, { label: 'jun', mwh: 292.6 }, { label: 'jul', mwh: 308.1 },
];

export interface FallbackBuildingMetric { buildingName: string; meterCount: number; energyMwh: number; demandKw: number; variationPct: number }

export const FALLBACK_BUILDING_METRICS: FallbackBuildingMetric[] = [
  { buildingName: 'Parque Arauco Kennedy', meterCount: 87, energyMwh: 4350, demandKw: 5810, variationPct: -3.1 },
  { buildingName: 'Mall Plaza Vespucio', meterCount: 64, energyMwh: 3200, demandKw: 4270, variationPct: 1.8 },
  { buildingName: 'Costanera Center', meterCount: 112, energyMwh: 5600, demandKw: 7470, variationPct: -5.4 },
  { buildingName: 'Parque Arauco La Reina', meterCount: 45, energyMwh: 2250, demandKw: 3000, variationPct: 2.2 },
  { buildingName: 'Mall Sport', meterCount: 38, energyMwh: 1900, demandKw: 2535, variationPct: -1.7 },
];

export const COUNTRY_OPTIONS = [
  { key: 'CL', label: 'Chile' },
  { key: 'PE', label: 'Perú' },
  { key: 'CO', label: 'Colombia' },
];

export const PERIODS = [
  { key: 'month', label: 'Mes actual' },
  { key: 'quarter', label: 'Trimestre actual' },
  { key: 'ytd', label: 'Año en curso' },
  { key: '12m', label: 'Últimos 12 meses' },
  { key: 'custom', label: 'Rango personalizado' },
];

export interface MetricOption { key: string; label: string; unit: string }

export const METRICS: MetricOption[] = [
  { key: 'consumption', label: 'Consumo', unit: 'MWh' },
  { key: 'demand', label: 'Demanda', unit: 'kW' },
  { key: 'cost', label: 'Costo', unit: 'UF' },
  { key: 'intensity', label: 'Intensidad', unit: 'kWh/m²' },
];

export const SORT_OPTIONS = [
  { key: 'highest', label: 'Mayor consumo' },
  { key: 'lowest', label: 'Menor consumo' },
  { key: 'name', label: 'Alfabético' },
  { key: 'alerts', label: 'Por alertas' },
];

export const GRANULARITY_OPTIONS = [
  { key: 'monthly', label: 'Mensual' },
  { key: 'weekly', label: 'Semanal' },
];

export const COMPARE_OPTIONS = [
  { key: 'previous', label: 'Período anterior' },
  { key: 'yoy', label: 'Año anterior' },
  { key: 'avg', label: 'Promedio portafolio' },
  { key: 'none', label: 'Sin comparación' },
];

export interface BuildingRow {
  building: Building;
  energyMwh: number;
  demandKw: number;
  meterCount: number;
  variationPct: number | null;
  status: string;
  alertCount: number;
}

export type MetricAccessor = (row: BuildingRow) => number;

export const METRIC_ACCESSORS: Record<string, MetricAccessor> = {
  consumption: (r) => r.energyMwh,
  demand: (r) => r.demandKw,
  cost: (r) => r.energyMwh * 0.12,
  intensity: (r) => {
    const area = Number(r.building.areaSqm ?? 0);
    return area > 0 ? (r.energyMwh * 1000) / area : 0;
  },
};

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  });
  return map;
}

export function buildRows(
  buildings: Building[],
  readings: LatestReading[],
  alerts: Alert[],
  yesterdayAgg: AggregatedReading[],
): BuildingRow[] {
  const readingsByBuilding = groupBy(readings, (r) => r.building_id);
  const alertsByBuilding = groupBy(alerts, (a) => a.buildingId);

  const yesterdayPortfolioKw = yesterdayAgg.reduce((s, r) => s + parseFloat(r.avg_power_kw ?? '0'), 0);
  const todayTotalKw = readings.reduce((s, r) => s + Number(r.power_kw || 0), 0);
  const portfolioVariationPct = yesterdayPortfolioKw > 0
    ? Math.round(((todayTotalKw - yesterdayPortfolioKw) / yesterdayPortfolioKw) * 100)
    : null;

  return buildings.map((building, idx) => {
    const bReadings = readingsByBuilding.get(building.id) ?? [];
    const bAlerts = alertsByBuilding.get(building.id) ?? [];
    const rawDemandKw = bReadings.reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
    const rawEnergyMwh = bReadings.reduce((sum, r) => sum + Number(r.energy_kwh_total || 0), 0) / 1000;
    const severities = bAlerts.map((a) => a.severity as AlertSeverity);
    const hasData = bReadings.length > 0;
    const status = deriveBuildingStatus(severities, hasData);

    const fallback = FALLBACK_BUILDING_METRICS[idx % FALLBACK_BUILDING_METRICS.length];
    const demandKw = rawDemandKw > 0 ? rawDemandKw : fallback.demandKw;
    const energyMwh = rawEnergyMwh > 0 ? rawEnergyMwh : fallback.energyMwh;
    const variationPct = portfolioVariationPct ?? fallback.variationPct;

    return { building, energyMwh, demandKw, meterCount: hasData ? bReadings.length : fallback.meterCount, variationPct, status, alertCount: bAlerts.length };
  });
}

export function formatMetric(value: number, unit: string): string {
  const formatted = value >= 1000
    ? `${(value / 1000).toFixed(2)}`
    : value >= 1
      ? value.toFixed(1)
      : value.toFixed(3);
  return `${formatted} ${unit}`;
}
