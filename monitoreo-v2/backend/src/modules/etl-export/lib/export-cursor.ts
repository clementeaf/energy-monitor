/**
 * Encodes a readings export cursor as base64url JSON.
 * @param timestamp - ISO8601 reading timestamp
 * @param id - Reading UUID
 * @returns Opaque cursor token
 */
export function encodeExportCursor(timestamp: string, id: string): string {
  return Buffer.from(JSON.stringify({ t: timestamp, i: id }), 'utf8').toString('base64url');
}

export interface DecodedExportCursor {
  timestamp: string;
  id: string;
}

/**
 * Decodes an export cursor token.
 * @param cursor - Opaque cursor from query param or watermark
 * @returns Parsed cursor or null when invalid
 */
export function decodeExportCursor(cursor: string): DecodedExportCursor | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 't' in parsed
      && 'i' in parsed
      && typeof (parsed as { t: unknown }).t === 'string'
      && typeof (parsed as { i: unknown }).i === 'string'
    ) {
      return {
        timestamp: (parsed as { t: string }).t,
        id: (parsed as { i: string }).i,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Escapes a CSV field value.
 * @param value - Raw cell value
 * @returns CSV-safe string
 */
export function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Builds one CSV line from column values.
 * @param values - Cell values
 * @returns CSV row string without trailing newline
 */
export function csvRow(values: string[]): string {
  return values.map((v) => escapeCsvField(v)).join(',');
}

export const READINGS_EXPORT_CSV_HEADER = [
  'meter_id',
  'timestamp',
  'power_kw',
  'energy_kwh_total',
  'quality',
  'source',
  'voltage_l1',
  'power_factor',
  'frequency_hz',
].join(',');
