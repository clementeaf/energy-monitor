import type { LatestReading } from '../types/reading';

export type MeterCommStatus = 'online' | 'stale' | 'offline' | 'alarm';

export interface MeterStatusConfig {
  label: string;
  dot: string;
}

export const METER_STATUS_CONFIG: Record<MeterCommStatus, MeterStatusConfig> = {
  online: { label: 'En linea', dot: 'bg-green-500' },
  stale: { label: 'Obsoleto', dot: 'bg-amber-500' },
  offline: { label: 'Sin datos', dot: 'bg-gray-400' },
  alarm: { label: 'Alarma', dot: 'bg-red-500' },
};

const DEFAULT_STALE_THRESHOLD_HOURS = 4;

/**
 * Resolves stale threshold hours from tenant settings JSON.
 */
export function resolveStaleThresholdHours(settings: Record<string, unknown> | null | undefined): number {
  const raw = settings?.staleThresholdHours;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 72) {
    return raw;
  }
  return DEFAULT_STALE_THRESHOLD_HOURS;
}

/**
 * Classifies meter communication status from latest reading age and active alerts.
 */
export function getMeterCommStatus(
  reading: Pick<LatestReading, 'meter_id' | 'timestamp'>,
  alertMeterIds: Set<string>,
  staleThresholdHours: number,
): MeterCommStatus {
  if (alertMeterIds.has(reading.meter_id)) return 'alarm';
  if (!reading.timestamp) return 'offline';
  const ageMs = Date.now() - new Date(reading.timestamp).getTime();
  const staleMs = staleThresholdHours * 60 * 60 * 1000;
  if (ageMs > staleMs) return 'stale';
  return 'online';
}
