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

export interface PlaceholderMallCard {
  id: string; name: string; countryCode: string; totalMeters: number;
  onlineCount: number; offlineCount: number; staleCount: number;
  onlinePct: number; lastReading: string; semaphore: MallCard['semaphore']; alertCount: number;
}

export const PLACEHOLDER_MALL_CARDS: PlaceholderMallCard[] = [
  { id: 'ph-1', name: 'Mall del Mar', countryCode: 'CL', totalMeters: 210, onlineCount: 204, offlineCount: 3, staleCount: 3, onlinePct: 97.1, lastReading: '08:45, 18 jul', semaphore: 'green', alertCount: 0 },
  { id: 'ph-2', name: 'Costanera Center', countryCode: 'CL', totalMeters: 195, onlineCount: 188, offlineCount: 4, staleCount: 3, onlinePct: 96.4, lastReading: '08:42, 18 jul', semaphore: 'green', alertCount: 1 },
  { id: 'ph-3', name: 'Alto Las Condes', countryCode: 'CL', totalMeters: 180, onlineCount: 164, offlineCount: 9, staleCount: 7, onlinePct: 91.1, lastReading: '08:30, 18 jul', semaphore: 'yellow', alertCount: 2 },
  { id: 'ph-4', name: 'Open Temuco', countryCode: 'CL', totalMeters: 155, onlineCount: 128, offlineCount: 18, staleCount: 9, onlinePct: 82.6, lastReading: '06:15, 18 jul', semaphore: 'red', alertCount: 3 },
  { id: 'ph-5', name: 'SC52', countryCode: 'CL', totalMeters: 135, onlineCount: 130, offlineCount: 3, staleCount: 2, onlinePct: 96.3, lastReading: '08:40, 18 jul', semaphore: 'green', alertCount: 0 },
];

export const PLACEHOLDER_FEED_EVENTS: FeedEvent[] = [
  { id: 'ph-evt-1', type: 'alert', message: 'Voltaje fuera de rango (387V > 386V límite)', building: 'Open Temuco', timestamp: new Date(Date.now() - 12 * 60_000).toISOString() },
  { id: 'ph-evt-2', type: 'stale', message: 'MED-0412 (PAC-412) — Dato estancado', building: 'Alto Las Condes', timestamp: new Date(Date.now() - 38 * 60_000).toISOString() },
  { id: 'ph-evt-3', type: 'offline', message: 'MED-0318 (PAC-318) — Offline', building: 'Open Temuco', timestamp: new Date(Date.now() - 72 * 60_000).toISOString() },
  { id: 'ph-evt-4', type: 'backfill', message: 'Backfill completado — 144 filas', building: '', timestamp: new Date(Date.now() - 130 * 60_000).toISOString() },
  { id: 'ph-evt-5', type: 'cnr', message: 'CNR ingresada — corte programado subestación norte', building: 'Costanera Center', timestamp: new Date(Date.now() - 210 * 60_000).toISOString() },
];

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

export const PLACEHOLDER_HISTOGRAM = [92,94,88,85,82,80,85,90,95,97,98,96,94,92,90,88,91,93,95,96,94,92,90,88];
