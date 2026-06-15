/**
 * ARQ-01: Timezone-aware time_bucket for daily/monthly aggregation.
 *
 * TimescaleDB time_bucket supports an optional timezone parameter
 * for intervals >= 1 day, aligning buckets to local midnight.
 *
 * For sub-day intervals (5min, 15min, 1h), timezone alignment is unnecessary
 * because buckets are relative and don't cross day boundaries meaningfully.
 */

const TIMEZONE_RELEVANT_INTERVALS = new Set(['1 day', '1 month']);

/**
 * Returns a time_bucket SQL expression that includes timezone when relevant.
 *
 * @param interval - PostgreSQL interval string (e.g., '1 day', '15 minutes')
 * @param tsColumn - Timestamp column reference (e.g., 'timestamp', 'r.timestamp')
 * @param timezone - IANA timezone string (e.g., 'America/Santiago')
 * @param intervalParam - If interval comes from a $N parameter, pass the placeholder (e.g., '$1::interval')
 * @returns SQL expression for time_bucket
 */
export function timeBucketExpr(
  interval: string,
  tsColumn: string,
  timezone: string,
  intervalParam?: string,
): string {
  const intervalSql = intervalParam ?? `'${interval}'`;
  const needsTimezone = TIMEZONE_RELEVANT_INTERVALS.has(interval) && timezone !== 'UTC';
  return needsTimezone
    ? `time_bucket(${intervalSql}, ${tsColumn}, '${timezone}')`
    : `time_bucket(${intervalSql}, ${tsColumn})`;
}

/**
 * Returns true when the interval benefits from timezone alignment.
 */
export function intervalNeedsTimezone(interval: string): boolean {
  return TIMEZONE_RELEVANT_INTERVALS.has(interval);
}
