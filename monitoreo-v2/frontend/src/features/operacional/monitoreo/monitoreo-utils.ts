import type { Building } from '../../../types/building';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';
import type { Alert } from '../../../types/alert';

export type MeterStatus = 'online' | 'offline' | 'stale';

export const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000;

export const STATUS_STYLES: Record<MeterStatus, { dot: string; label: string }> = {
  online: { dot: 'bg-emerald-500', label: 'En línea' },
  offline: { dot: 'bg-red-500', label: 'Offline' },
  stale: { dot: 'bg-amber-500', label: 'Dato estancado' },
};

export function deriveMeterStatus(reading: LatestReading | undefined, now: number): MeterStatus {
  if (!reading) return 'offline';
  if ((now - new Date(reading.timestamp).getTime()) > STALE_THRESHOLD_MS) return 'stale';
  return 'online';
}

export interface MallCard {
  building: Building;
  totalMeters: number;
  onlineCount: number;
  offlineCount: number;
  staleCount: number;
  onlinePct: number;
  lastReading: string | null;
  semaphore: 'green' | 'yellow' | 'red';
  alertCount: number;
}

export function deriveSemaphore(pct: number): MallCard['semaphore'] {
  if (pct >= 95) return 'green';
  if (pct >= 85) return 'yellow';
  return 'red';
}

export const SEMAPHORE_STYLES: Record<string, string> = {
  green: 'border-emerald-500 bg-emerald-50',
  yellow: 'border-amber-500 bg-amber-50',
  red: 'border-red-500 bg-red-50',
};

export function buildMallCards(
  buildings: Building[],
  meters: Meter[],
  readings: LatestReading[],
  alerts: Alert[],
  now: number,
): MallCard[] {
  const metersByBuilding = new Map<string, Meter[]>();
  meters.forEach((m) => {
    const list = metersByBuilding.get(m.buildingId) ?? [];
    list.push(m);
    metersByBuilding.set(m.buildingId, list);
  });

  const readingByMeter = new Map(readings.map((r) => [r.meter_id, r]));

  const alertsByBuilding = new Map<string, number>();
  alerts.forEach((a) => {
    alertsByBuilding.set(a.buildingId, (alertsByBuilding.get(a.buildingId) ?? 0) + 1);
  });

  return buildings.map((building) => {
    const bMeters = metersByBuilding.get(building.id) ?? [];
    const totalMeters = bMeters.length;
    let onlineCount = 0, offlineCount = 0, staleCount = 0, lastTs = 0;

    bMeters.forEach((meter) => {
      const reading = readingByMeter.get(meter.id);
      const status = deriveMeterStatus(reading, now);
      if (status === 'online') onlineCount++;
      else if (status === 'offline') offlineCount++;
      else staleCount++;
      const ts = reading ? new Date(reading.timestamp).getTime() : 0;
      lastTs = Math.max(lastTs, ts);
    });

    const onlinePct = totalMeters > 0 ? (onlineCount / totalMeters) * 100 : 0;

    return {
      building, totalMeters, onlineCount, offlineCount, staleCount, onlinePct,
      lastReading: lastTs > 0 ? new Date(lastTs).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : null,
      semaphore: deriveSemaphore(onlinePct),
      alertCount: alertsByBuilding.get(building.id) ?? 0,
    };
  });
}

export interface FeedEvent {
  id: string;
  type: 'alert' | 'offline' | 'stale' | 'backfill' | 'cnr';
  message: string;
  building: string;
  timestamp: string;
}

export const PAIS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Perú' },
  { value: 'CO', label: 'Colombia' },
];

export const ESTADO_MEDIDOR_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'online', label: 'En línea' },
  { value: 'offline', label: 'Offline' },
  { value: 'stale', label: 'Dato estancado' },
];

