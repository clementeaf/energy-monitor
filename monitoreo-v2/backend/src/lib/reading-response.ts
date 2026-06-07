import type { ReadingQuality } from '../common/constants/reading-quality';
import { formatTimestampLocal, toTimestampUtc } from './timezone';

export interface ReadingRow {
  id: string;
  meter_id: string;
  timestamp: string;
  voltage_l1: string | null;
  voltage_l2: string | null;
  voltage_l3: string | null;
  current_l1: string | null;
  current_l2: string | null;
  current_l3: string | null;
  power_kw: string;
  reactive_power_kvar: string | null;
  power_factor: string | null;
  frequency_hz: string | null;
  energy_kwh_total: string;
  thd_voltage_pct: string | null;
  thd_current_pct: string | null;
  phase_imbalance_pct: string | null;
  quality?: ReadingQuality | string;
  source?: string | null;
  ingested_at?: string | null;
}

export interface ReadingResponse extends ReadingRow {
  timestamp_utc: string;
  timezone: string;
  timestamp_local: string;
}

export interface LatestRow {
  meter_id: string;
  meter_name: string;
  building_id: string;
  tenant_id: string;
  timestamp: string | null;
  power_kw: string | null;
  energy_kwh_total: string | null;
  voltage_l1: string | null;
  current_l1: string | null;
  power_factor: string | null;
  frequency_hz: string | null;
  timezone?: string;
  timestamp_utc?: string | null;
  timestamp_local?: string | null;
}

export interface AggregatedRow {
  bucket: string;
  meter_id: string;
  avg_power_kw: string;
  max_power_kw: string;
  min_power_kw: string;
  avg_power_factor: string | null;
  avg_voltage_l1: string | null;
  energy_delta_kwh: string;
  reading_count: string;
}

/**
 * Adds UTC/local timezone fields to a raw reading row from SQL.
 */
export function enrichReadingRow(row: ReadingRow, timezone: string): ReadingResponse {
  const timestampUtc = toTimestampUtc(row.timestamp);
  return {
    ...row,
    timestamp: timestampUtc,
    timestamp_utc: timestampUtc,
    timezone,
    timestamp_local: formatTimestampLocal(timestampUtc, timezone),
    quality: (row.quality ?? 'unknown') as ReadingQuality,
    source: row.source ?? null,
    ingested_at: row.ingested_at ?? null,
  };
}

/**
 * Adds timezone presentation fields to a latest-reading row when timestamp exists.
 */
export function enrichLatestRow(row: LatestRow): LatestRow {
  if (!row.timestamp || !row.timezone) {
    return {
      ...row,
      timestamp_utc: row.timestamp ?? null,
      timestamp_local: null,
    };
  }
  const timestampUtc = toTimestampUtc(row.timestamp);
  return {
    ...row,
    timestamp: timestampUtc,
    timestamp_utc: timestampUtc,
    timestamp_local: formatTimestampLocal(timestampUtc, row.timezone),
  };
}
