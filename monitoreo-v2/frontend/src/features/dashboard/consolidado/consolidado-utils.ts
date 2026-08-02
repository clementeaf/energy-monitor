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
  enabled: boolean;
}

export const COUNTRIES: Country[] = [
  { code: 'CL', label: 'Chile', enabled: true },
  { code: 'PE', label: 'Perú', enabled: false },
  { code: 'CO', label: 'Colombia', enabled: false },
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

