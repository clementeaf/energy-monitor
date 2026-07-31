import { deriveBuildingStatus, type EnergyStatus } from '../../../lib/energy-status';
import type { Building } from '../../../types/building';
import type { LatestReading } from '../../../types/reading';
import type { Alert, AlertSeverity } from '../../../types/alert';

export interface EnrichedBuilding {
  building: Building;
  powerKw: number;
  meterCount: number;
  status: EnergyStatus;
  activeAlerts: Alert[];
}

export interface Country {
  code: string;
  label: string;
}

export const COUNTRIES: Country[] = [
  { code: 'CL', label: 'Chile' },
  { code: 'PE', label: 'Perú' },
  { code: 'CO', label: 'Colombia' },
];

export const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};

export const SEVERITY_LABELS: Record<string, string> = {
  critical: 'URGENTE',
  high: 'ADVERTENCIA',
  medium: 'MEDIO',
  low: 'INFO',
};

export function enrichBuildings(
  buildings: Building[],
  readings: LatestReading[],
  alerts: Alert[],
): EnrichedBuilding[] {
  const readingsByBuilding = new Map<string, LatestReading[]>();
  readings.forEach((r) => {
    const list = readingsByBuilding.get(r.building_id) ?? [];
    list.push(r);
    readingsByBuilding.set(r.building_id, list);
  });

  const alertsByBuilding = new Map<string, Alert[]>();
  alerts.forEach((a) => {
    const list = alertsByBuilding.get(a.buildingId) ?? [];
    list.push(a);
    alertsByBuilding.set(a.buildingId, list);
  });

  return buildings.map((building) => {
    const bReadings = readingsByBuilding.get(building.id) ?? [];
    const bAlerts = alertsByBuilding.get(building.id) ?? [];
    const powerKw = bReadings.reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
    const severities = bAlerts.map((a) => a.severity as AlertSeverity);
    const status = deriveBuildingStatus(severities, bReadings.length > 0);
    return { building, powerKw, meterCount: bReadings.length, status, activeAlerts: bAlerts };
  });
}

export const FALLBACK_CONSUMPTION_MWH = 1847.3;
export const FALLBACK_COST_UF = 4210.5;
export const FALLBACK_VARIATION_PCT = -2.3;

const FB_ALERT_BASE = {
  alertRuleId: null, alertTypeCode: 'threshold', triggeredValue: null, thresholdValue: null,
  assignedTo: null, acknowledgedBy: null, acknowledgedAt: null,
  resolvedBy: null, resolvedAt: null, resolutionNotes: null,
  status: 'active' as const,
};

export const FALLBACK_EVENTS: Alert[] = [
  {
    ...FB_ALERT_BASE,
    id: 'fb-1', buildingId: 'fb-building-1', meterId: null,
    severity: 'critical' as AlertSeverity,
    message: 'Sobrecarga detectada en tablero principal — consumo 142% del límite contratado',
    createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
  },
  {
    ...FB_ALERT_BASE,
    id: 'fb-2', buildingId: 'fb-building-2', meterId: null,
    severity: 'high' as AlertSeverity,
    message: 'Factor de potencia bajo umbral — FP 0.72 (mín. 0.90) en medidor M-205',
    createdAt: new Date(Date.now() - 47 * 60_000).toISOString(),
  },
  {
    ...FB_ALERT_BASE,
    id: 'fb-3', buildingId: 'fb-building-3', meterId: null,
    severity: 'high' as AlertSeverity,
    message: 'Pérdida de comunicación con concentrador C-07 — 14 medidores sin datos',
    createdAt: new Date(Date.now() - 93 * 60_000).toISOString(),
  },
  {
    ...FB_ALERT_BASE,
    id: 'fb-4', buildingId: 'fb-building-1', meterId: null,
    severity: 'critical' as AlertSeverity,
    message: 'Voltaje fuera de rango — L2 253 V (máx. 240 V) durante 22 minutos',
    createdAt: new Date(Date.now() - 130 * 60_000).toISOString(),
  },
];

export const FALLBACK_BUILDINGS_FOR_FEED: Building[] = [
  { id: 'fb-building-1', name: 'Parque Arauco Kennedy', isActive: true, address: 'Av. Kennedy 5413, Las Condes', countryCode: 'CL' } as Building,
  { id: 'fb-building-2', name: 'Mall Plaza Vespucio', isActive: true, address: 'Av. Vicuña Mackenna 7110, La Florida', countryCode: 'CL' } as Building,
  { id: 'fb-building-3', name: 'Costanera Center', isActive: true, address: 'Av. Andrés Bello 2447, Providencia', countryCode: 'CL' } as Building,
];
