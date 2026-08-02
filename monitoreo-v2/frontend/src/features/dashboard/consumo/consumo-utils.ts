import { deriveBuildingStatus } from '../../../lib/energy-status';
import type { Building } from '../../../types/building';
import type { LatestReading, AggregatedReading } from '../../../types/reading';
import type { Alert, AlertSeverity } from '../../../types/alert';

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

  return buildings.map((building) => {
    const bReadings = readingsByBuilding.get(building.id) ?? [];
    const bAlerts = alertsByBuilding.get(building.id) ?? [];
    const rawDemandKw = bReadings.reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
    const rawEnergyMwh = bReadings.reduce((sum, r) => sum + Number(r.energy_kwh_total || 0), 0) / 1000;
    const severities = bAlerts.map((a) => a.severity as AlertSeverity);
    const hasData = bReadings.length > 0;
    const status = deriveBuildingStatus(severities, hasData);

    return { building, energyMwh: rawEnergyMwh, demandKw: rawDemandKw, meterCount: bReadings.length, variationPct: portfolioVariationPct, status, alertCount: bAlerts.length };
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
