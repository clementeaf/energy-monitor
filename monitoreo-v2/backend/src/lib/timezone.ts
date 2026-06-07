import type { DataSource } from 'typeorm';

export interface BuildingTimezoneRow {
  building_timezone: string | null;
  tenant_timezone: string;
}

const DEFAULT_TIMEZONE = 'UTC';

/**
 * Resolves IANA timezone for a building, falling back to tenant default.
 */
export async function resolveBuildingTimezone(
  dataSource: DataSource,
  buildingId: string,
): Promise<string> {
  const rows: BuildingTimezoneRow[] = await dataSource.query(
    `SELECT b.timezone AS building_timezone, t.timezone AS tenant_timezone
     FROM buildings b
     JOIN tenants t ON t.id = b.tenant_id
     WHERE b.id = $1`,
    [buildingId],
  );
  const row = rows[0];
  if (!row) return DEFAULT_TIMEZONE;
  return row.building_timezone ?? row.tenant_timezone ?? DEFAULT_TIMEZONE;
}

/**
 * Resolves IANA timezone for a meter via its building (with tenant fallback).
 */
export async function resolveMeterTimezone(
  dataSource: DataSource,
  meterId: string,
): Promise<string> {
  const rows: Array<{ timezone: string }> = await dataSource.query(
    `SELECT COALESCE(b.timezone, t.timezone, $2) AS timezone
     FROM meters m
     JOIN buildings b ON b.id = m.building_id
     JOIN tenants t ON t.id = m.tenant_id
     WHERE m.id = $1`,
    [meterId, DEFAULT_TIMEZONE],
  );
  return rows[0]?.timezone ?? DEFAULT_TIMEZONE;
}

/**
 * Formats a UTC timestamp as local ISO8601-like string in the given IANA timezone.
 */
export function formatTimestampLocal(timestampUtc: string, timezone: string): string {
  const date = new Date(timestampUtc);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Normalizes DB timestamp to ISO8601 UTC string.
 */
export function toTimestampUtc(timestamp: string | Date): string {
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toISOString();
  }
  return timestamp.toISOString();
}
