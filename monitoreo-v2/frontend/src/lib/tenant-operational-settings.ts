export interface TenantOperationalSettings {
  retentionYears: number;
  staleThresholdHours: number;
}

const DEFAULT_RETENTION_YEARS = 5;
const DEFAULT_STALE_THRESHOLD_HOURS = 4;

/**
 * Parses operational settings from tenant settings JSON.
 */
export function parseTenantOperationalSettings(
  settings: Record<string, unknown> | null | undefined,
): TenantOperationalSettings {
  const rawRetention = settings?.retentionYears;
  const retentionYears =
    typeof rawRetention === 'number' && Number.isInteger(rawRetention) && rawRetention >= 1 && rawRetention <= 10
      ? rawRetention
      : DEFAULT_RETENTION_YEARS;

  const rawStale = settings?.staleThresholdHours;
  const staleThresholdHours =
    typeof rawStale === 'number' && Number.isInteger(rawStale) && rawStale >= 1 && rawStale <= 72
      ? rawStale
      : DEFAULT_STALE_THRESHOLD_HOURS;

  return { retentionYears, staleThresholdHours };
}
