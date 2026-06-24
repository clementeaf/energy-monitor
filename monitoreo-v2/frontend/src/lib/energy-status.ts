import type { AlertSeverity } from '../types/alert';

/**
 * Energy status colors from the EMS spec (docs/roles-ems.md).
 * Consistent across all levels: map markers, floor plans, zone blocks.
 */
export type EnergyStatus = 'normal' | 'warning' | 'critical' | 'nodata';

interface StatusStyle {
  bg: string;
  text: string;
  marker: string;
  label: string;
}

const STATUS_STYLES: Record<EnergyStatus, StatusStyle> = {
  normal:   { bg: 'bg-emerald-500', text: 'text-emerald-600', marker: '#10b981', label: 'Normal' },
  warning:  { bg: 'bg-amber-500',   text: 'text-amber-600',   marker: '#f59e0b', label: 'Alerta' },
  critical: { bg: 'bg-red-500',     text: 'text-red-600',     marker: '#ef4444', label: 'Crítico' },
  nodata:   { bg: 'bg-gray-400',    text: 'text-gray-500',    marker: '#9ca3af', label: 'Sin datos' },
};

export function getStatusStyle(status: EnergyStatus): StatusStyle {
  return STATUS_STYLES[status];
}

/**
 * Derives energy status from alert severity.
 * Uses the most severe active alert to determine status.
 */
const SEVERITY_TO_STATUS: Record<AlertSeverity, EnergyStatus> = {
  critical: 'critical',
  high: 'critical',
  medium: 'warning',
  low: 'warning',
};

export function severityToStatus(severity: AlertSeverity): EnergyStatus {
  return SEVERITY_TO_STATUS[severity];
}

/**
 * Derives energy status for a building from its active alerts.
 * Most severe alert wins. No alerts + has data = normal. No data = nodata.
 */
export function deriveBuildingStatus(
  activeAlertSeverities: AlertSeverity[],
  hasData: boolean,
): EnergyStatus {
  const statusPriority: EnergyStatus[] = ['critical', 'warning', 'normal', 'nodata'];
  const derived = activeAlertSeverities.map(severityToStatus);
  return statusPriority.find((s) => derived.includes(s))
    ?? (hasData ? 'normal' : 'nodata');
}
