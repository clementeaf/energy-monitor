import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReadingQueryDto } from './dto/reading-query.dto';
import { LatestQueryDto } from './dto/latest-query.dto';
import { AggregatedQueryDto } from './dto/aggregated-query.dto';
import { resolveMeterTimezone } from '../../lib/timezone';
import {
  type ReadingRow,
  type ReadingResponse,
  type LatestRow,
  type AggregatedRow,
  enrichReadingRow,
  enrichLatestRow,
} from '../../lib/reading-response';

export type { ReadingRow, ReadingResponse, LatestRow, AggregatedRow };

const RESOLUTION_MAP: Record<string, string> = {
  '5min': '5 minutes',
  '15min': '15 minutes',
  '1h': '1 hour',
  '1d': '1 day',
};

const INTERVAL_MAP: Record<string, string> = {
  '15min': '15 minutes',
  hourly: '1 hour',
  daily: '1 day',
  monthly: '1 month',
};

interface AggregateSource {
  /** Materialized view name — must be in SAFE_VIEW_NAMES. */
  view: string;
  /** If set, re-bucket the view with this interval — must be in SAFE_INTERVALS. */
  reBucket?: string;
}

/**
 * Whitelist of allowed view names and intervals to prevent SQL injection.
 * These are the ONLY values that can be interpolated into SQL templates.
 */
const SAFE_VIEW_NAMES = new Set(['readings_15min', 'readings_hourly', 'readings_daily']);
const SAFE_INTERVALS = new Set(['15 minutes', '1 hour', '1 day', '1 month']);

function assertSafeView(view: string): void {
  if (!SAFE_VIEW_NAMES.has(view)) {
    throw new Error(`Unsafe view name rejected: ${view}`);
  }
}

function assertSafeInterval(interval: string): void {
  if (!SAFE_INTERVALS.has(interval)) {
    throw new Error(`Unsafe interval rejected: ${interval}`);
  }
}

/** Maps interval to the continuous aggregate view to query. */
const AGGREGATE_VIEW_MAP: Record<string, AggregateSource> = {
  '15min': { view: 'readings_15min' },
  hourly: { view: 'readings_hourly' },
  daily: { view: 'readings_daily' },
  monthly: { view: 'readings_daily', reBucket: '1 month' },
};

/** Use readings_15min CAGG for aggregated 15min queries beyond this range (ms). */
const CAGG_15MIN_RANGE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns true when the query range exceeds 7 days (15min CAGG path).
 */
function isRangeLongerThan7Days(from: string, to: string): boolean {
  return new Date(to).getTime() - new Date(from).getTime() > CAGG_15MIN_RANGE_THRESHOLD_MS;
}

/**
 * Returns true when PostgreSQL reports an unpopulated materialized view (SQLSTATE 55000).
 */
function isUnpopulatedMatviewError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const driverErr = (err as unknown as { driverError?: { code?: string } }).driverError;
  if (driverErr?.code === '55000') return true;
  return err.message.toLowerCase().includes('has not been populated');
}

interface CacheEntry {
  data: AggregatedRow[];
  expiry: number;
}

const PORTFOLIO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class ReadingsService {
  private portfolioCache = new Map<string, CacheEntry>();

  constructor(private readonly dataSource: DataSource) {}

  private getCached(key: string): AggregatedRow[] | null {
    const entry = this.portfolioCache.get(key);
    if (entry && entry.expiry > Date.now()) return entry.data;
    this.portfolioCache.delete(key);
    return null;
  }

  private setCache(key: string, data: AggregatedRow[]): void {
    // Don't cache empty results — may be a transient issue
    if (data.length === 0) return;
    this.portfolioCache.set(key, { data, expiry: Date.now() + PORTFOLIO_CACHE_TTL });
  }

  async findByMeter(
    tenantId: string,
    buildingIds: string[],
    query: ReadingQueryDto,
  ): Promise<ReadingResponse[]> {
    const resolution = query.resolution ?? 'raw';
    const limit = query.limit ?? 1000;

    const meterCheck = await this.buildMeterScopeCheck(
      tenantId,
      buildingIds,
      query.meterId,
    );
    if (!meterCheck) return [];

    const timezone = await resolveMeterTimezone(this.dataSource, query.meterId);

    let rows: ReadingRow[];

    if (resolution === 'raw') {
      rows = await this.dataSource.query(
        `SELECT id, meter_id, timestamp,
                voltage_l1, voltage_l2, voltage_l3,
                current_l1, current_l2, current_l3,
                power_kw, reactive_power_kvar, power_factor,
                frequency_hz, energy_kwh_total,
                thd_voltage_pct, thd_current_pct, phase_imbalance_pct,
                quality::text AS quality, source, ingested_at
         FROM readings
         WHERE meter_id = $1
           AND timestamp >= $2
           AND timestamp <= $3
         ORDER BY timestamp ASC
         LIMIT $4`,
        [query.meterId, query.from, query.to, limit],
      );
    } else {
      const pgInterval = RESOLUTION_MAP[resolution];
      if (!pgInterval) return [];

      rows = await this.dataSource.query(
        `SELECT
           time_bucket($1::interval, timestamp) AS timestamp,
           meter_id,
           '' AS id,
           AVG(voltage_l1::numeric)::text AS voltage_l1,
           AVG(voltage_l2::numeric)::text AS voltage_l2,
           AVG(voltage_l3::numeric)::text AS voltage_l3,
           AVG(current_l1::numeric)::text AS current_l1,
           AVG(current_l2::numeric)::text AS current_l2,
           AVG(current_l3::numeric)::text AS current_l3,
           AVG(power_kw::numeric)::text AS power_kw,
           AVG(reactive_power_kvar::numeric)::text AS reactive_power_kvar,
           AVG(power_factor::numeric)::text AS power_factor,
           AVG(frequency_hz::numeric)::text AS frequency_hz,
           MAX(energy_kwh_total::numeric)::text AS energy_kwh_total,
           AVG(thd_voltage_pct::numeric)::text AS thd_voltage_pct,
           AVG(thd_current_pct::numeric)::text AS thd_current_pct,
           AVG(phase_imbalance_pct::numeric)::text AS phase_imbalance_pct,
           'unknown' AS quality,
           NULL AS source,
           NULL AS ingested_at
         FROM readings
         WHERE meter_id = $2
           AND timestamp >= $3
           AND timestamp <= $4
         GROUP BY time_bucket($1::interval, timestamp), meter_id
         ORDER BY timestamp ASC
         LIMIT $5`,
        [pgInterval, query.meterId, query.from, query.to, limit],
      );
    }

    return rows.map((row) => enrichReadingRow(row, timezone));
  }

  async findLatest(
    tenantId: string,
    buildingIds: string[],
    query: LatestQueryDto,
    crossTenant = false,
  ): Promise<LatestRow[]> {
    const params: unknown[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (!crossTenant) {
      conditions.push(`m.tenant_id = $${paramIdx}`);
      params.push(tenantId);
      paramIdx++;

      if (buildingIds.length > 0) {
        const placeholders = buildingIds.map((_, i) => `$${paramIdx + i}`);
        conditions.push(`m.building_id IN (${placeholders.join(', ')})`);
        params.push(...buildingIds);
        paramIdx += buildingIds.length;
      }
    }

    if (query.buildingId) {
      conditions.push(`m.building_id = $${paramIdx}`);
      params.push(query.buildingId);
      paramIdx++;
    }

    if (query.meterId) {
      conditions.push(`m.id = $${paramIdx}`);
      params.push(query.meterId);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows: LatestRow[] = await this.dataSource.query(
      `SELECT
         m.id AS meter_id,
         m.name AS meter_name,
         m.building_id,
         m.tenant_id,
         lr.timestamp,
         lr.power_kw,
         lr.energy_kwh_total,
         lr.voltage_l1,
         lr.current_l1,
         lr.power_factor,
         lr.frequency_hz,
         COALESCE(b.timezone, t.timezone, 'UTC') AS timezone
       FROM meters m
       JOIN buildings b ON b.id = m.building_id
       JOIN tenants t ON t.id = m.tenant_id
       LEFT JOIN LATERAL (
         SELECT r.timestamp, r.power_kw, r.energy_kwh_total,
                r.voltage_l1, r.current_l1, r.power_factor, r.frequency_hz
         FROM readings r
         WHERE r.meter_id = m.id
         ORDER BY r.timestamp DESC
         LIMIT 1
       ) lr ON true
       ${whereClause}
       ORDER BY m.name`,
      params,
    );

    return rows.map((row) => enrichLatestRow(row));
  }

  /**
   * Aggregated readings using TimescaleDB continuous aggregates when available.
   * - hourly → reads from `readings_hourly` materialized view
   * - daily  → reads from `readings_daily` materialized view
   * - monthly → re-aggregates `readings_daily` with time_bucket('1 month')
   * Falls back to raw `time_bucket()` on `readings` if aggregates are unavailable.
   */
  async findAggregated(
    tenantId: string,
    buildingIds: string[],
    query: AggregatedQueryDto,
    crossTenant = false,
  ): Promise<AggregatedRow[]> {
    if (query.interval === '15min') {
      if (isRangeLongerThan7Days(query.from, query.to)) {
        return this.findFromAggregate(
          tenantId,
          buildingIds,
          query,
          { view: 'readings_15min' },
          crossTenant,
        );
      }
      return this.findFromRawBucket(tenantId, buildingIds, query, '15 minutes');
    }

    const pgInterval = INTERVAL_MAP[query.interval];
    if (!pgInterval) return [];

    // Portfolio cache — avoids slow sequential scans on continuous aggregates
    if (query.groupBy === 'portfolio') {
      const cacheKey = `${crossTenant ? '_all' : tenantId}:${query.interval}:${query.from}:${query.to}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const useAggregate = AGGREGATE_VIEW_MAP[query.interval];
      const result = useAggregate
        ? await this.findFromAggregate(tenantId, buildingIds, query, useAggregate, crossTenant)
        : await this.findFromRawBucket(tenantId, buildingIds, query, pgInterval);
      this.setCache(cacheKey, result);
      return result;
    }

    // Use continuous aggregates for hourly/daily/monthly
    const useAggregate = AGGREGATE_VIEW_MAP[query.interval];
    if (useAggregate) {
      return this.findFromAggregate(tenantId, buildingIds, query, useAggregate, crossTenant);
    }

    // Fallback: raw time_bucket on readings table
    return this.findFromRawBucket(tenantId, buildingIds, query, pgInterval);
  }

  /**
   * Query pre-computed continuous aggregate views.
   * For monthly: re-aggregate the daily view with time_bucket('1 month').
   */
  private async findFromAggregate(
    tenantId: string,
    buildingIds: string[],
    query: AggregatedQueryDto,
    agg: AggregateSource,
    crossTenant = false,
  ): Promise<AggregatedRow[]> {
    // Security: assert interpolated values are in whitelist (defense-in-depth)
    assertSafeView(agg.view);
    if (agg.reBucket) assertSafeInterval(agg.reBucket);
    const pgInterval = INTERVAL_MAP[query.interval] ?? '1 day';
    assertSafeInterval(pgInterval);

    const params: unknown[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (!crossTenant) {
      params.push(tenantId);
      conditions.push(`a.tenant_id = $${paramIdx}`);
      paramIdx++;
    }

    params.push(query.from, query.to);
    conditions.push(`a.bucket >= $${paramIdx}`, `a.bucket <= $${paramIdx + 1}`);
    paramIdx += 2;

    // Only JOIN meters when filtering by building — avoids expensive join on large datasets
    const needsMeterJoin = buildingIds.length > 0 || !!query.buildingId;
    const meterJoin = needsMeterJoin ? 'INNER JOIN meters m ON m.id = a.meter_id' : '';

    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${paramIdx + i}`);
      conditions.push(`m.building_id IN (${placeholders.join(', ')})`);
      params.push(...buildingIds);
      paramIdx += buildingIds.length;
    }

    if (query.buildingId) {
      conditions.push(`m.building_id = $${paramIdx}`);
      params.push(query.buildingId);
      paramIdx++;
    }

    if (query.meterId) {
      conditions.push(`a.meter_id = $${paramIdx}`);
      params.push(query.meterId);
      paramIdx++;
    }

    const where = conditions.join(' AND ');
    const isPortfolio = query.groupBy === 'portfolio';

    if (agg.reBucket) {
      if (isPortfolio) {
        const meterRows: { id: string }[] = crossTenant
          ? await this.dataSource.query(`SELECT id FROM meters`)
          : await this.dataSource.query(`SELECT id FROM meters WHERE tenant_id = $1`, [tenantId]);
        if (meterRows.length === 0) return [];
        const meterIds = meterRows.map((r) => r.id);

        return this.dataSource.query(
          `SELECT
             time_bucket('${agg.reBucket}', a.bucket) AS bucket,
             '_portfolio' AS meter_id,
             (SUM(a.avg_power_kw * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_power_kw,
             MAX(a.max_power_kw)::text AS max_power_kw,
             MIN(a.min_power_kw)::text AS min_power_kw,
             (SUM(a.avg_power_factor * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_power_factor,
             (SUM(a.avg_voltage_l1 * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_voltage_l1,
             SUM(a.max_energy_kwh_total - a.min_energy_kwh_total)::text AS energy_delta_kwh,
             SUM(a.reading_count)::text AS reading_count
           FROM ${agg.view} a
           WHERE a.meter_id = ANY($1)
             AND a.bucket >= $2 AND a.bucket <= $3
           GROUP BY time_bucket('${agg.reBucket}', a.bucket)
           ORDER BY bucket ASC`,
          [meterIds, query.from, query.to],
        );
      }

      return this.dataSource.query(
        `SELECT
           time_bucket('${agg.reBucket}', a.bucket) AS bucket,
           a.meter_id,
           (SUM(a.avg_power_kw * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_power_kw,
           MAX(a.max_power_kw)::text AS max_power_kw,
           MIN(a.min_power_kw)::text AS min_power_kw,
           (SUM(a.avg_power_factor * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_power_factor,
           (SUM(a.avg_voltage_l1 * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_voltage_l1,
           SUM(a.max_energy_kwh_total - a.min_energy_kwh_total)::text AS energy_delta_kwh,
           SUM(a.reading_count)::text AS reading_count
         FROM ${agg.view} a
         ${meterJoin}
         WHERE ${where}
         GROUP BY time_bucket('${agg.reBucket}', a.bucket), a.meter_id
         ORDER BY bucket ASC, a.meter_id ASC`,
        params,
      );
    }

    if (isPortfolio && !agg.reBucket) {
      return this.findPortfolioDaily(tenantId, query, crossTenant);
    }

    // groupBy=building: aggregate per building instead of per meter
    if (query.groupBy === 'building') {
      return this.dataSource.query(
        `SELECT
           a.bucket,
           m.building_id AS meter_id,
           (SUM(a.avg_power_kw * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_power_kw,
           MAX(a.max_power_kw)::text AS max_power_kw,
           MIN(a.min_power_kw)::text AS min_power_kw,
           (SUM(a.avg_power_factor * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_power_factor,
           (SUM(a.avg_voltage_l1 * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_voltage_l1,
           SUM(a.max_energy_kwh_total - a.min_energy_kwh_total)::text AS energy_delta_kwh,
           SUM(a.reading_count)::text AS reading_count
         FROM ${agg.view} a
         INNER JOIN meters m ON m.id = a.meter_id
         WHERE ${where}
         GROUP BY a.bucket, m.building_id
         ORDER BY a.bucket ASC, m.building_id ASC`,
        params,
      );
    }

    // Direct read from hourly or daily aggregate (per-meter)
    return this.dataSource.query(
      `SELECT
         a.bucket,
         a.meter_id,
         a.avg_power_kw::text AS avg_power_kw,
         a.max_power_kw::text AS max_power_kw,
         a.min_power_kw::text AS min_power_kw,
         a.avg_power_factor::text AS avg_power_factor,
         a.avg_voltage_l1::text AS avg_voltage_l1,
         (a.max_energy_kwh_total - a.min_energy_kwh_total)::text AS energy_delta_kwh,
         a.reading_count::text AS reading_count
       FROM ${agg.view} a
       ${meterJoin}
       WHERE ${where}
       ORDER BY a.bucket ASC, a.meter_id ASC`,
      params,
    );
  }

  /**
   * Portfolio daily aggregate — prefers portfolio_summary matview, falls back to readings_daily.
   */
  private async findPortfolioDaily(
    tenantId: string,
    query: AggregatedQueryDto,
    crossTenant: boolean,
  ): Promise<AggregatedRow[]> {
    try {
      return await this.queryPortfolioSummary(tenantId, query, crossTenant);
    } catch (err) {
      if (!isUnpopulatedMatviewError(err)) throw err;
      return this.queryPortfolioFromDaily(tenantId, query, crossTenant);
    }
  }

  /**
   * Reads pre-computed portfolio_summary materialized view (~5ms when populated).
   */
  private async queryPortfolioSummary(
    tenantId: string,
    query: AggregatedQueryDto,
    crossTenant: boolean,
  ): Promise<AggregatedRow[]> {
    if (crossTenant) {
      return this.dataSource.query(
        `SELECT
           bucket::text,
           '_portfolio' AS meter_id,
           SUM(sum_power_kw)::text AS avg_power_kw,
           MAX(max_power_kw)::text AS max_power_kw,
           MIN(min_power_kw)::text AS min_power_kw,
           (SUM(avg_power_factor * reading_count) / NULLIF(SUM(reading_count), 0))::text AS avg_power_factor,
           (SUM(avg_voltage_l1 * reading_count) / NULLIF(SUM(reading_count), 0))::text AS avg_voltage_l1,
           '0' AS energy_delta_kwh,
           SUM(reading_count)::text AS reading_count
         FROM portfolio_summary
         WHERE bucket >= $1::date AND bucket <= $2::date
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [query.from, query.to],
      );
    }
    return this.dataSource.query(
      `SELECT
         bucket::text,
         '_portfolio' AS meter_id,
         sum_power_kw::text AS avg_power_kw,
         max_power_kw::text AS max_power_kw,
         min_power_kw::text AS min_power_kw,
         avg_power_factor::text AS avg_power_factor,
         avg_voltage_l1::text AS avg_voltage_l1,
         '0' AS energy_delta_kwh,
         reading_count::text AS reading_count
       FROM portfolio_summary
       WHERE tenant_id = $1
         AND bucket >= $2::date AND bucket <= $3::date
       ORDER BY bucket ASC`,
      [tenantId, query.from, query.to],
    );
  }

  /**
   * Live portfolio aggregate from readings_daily when portfolio_summary is empty.
   */
  private async queryPortfolioFromDaily(
    tenantId: string,
    query: AggregatedQueryDto,
    crossTenant: boolean,
  ): Promise<AggregatedRow[]> {
    if (crossTenant) {
      return this.dataSource.query(
        `SELECT
           a.bucket::text,
           '_portfolio' AS meter_id,
           SUM(a.avg_power_kw * a.reading_count)::text AS avg_power_kw,
           MAX(a.max_power_kw)::text AS max_power_kw,
           MIN(a.min_power_kw)::text AS min_power_kw,
           (SUM(a.avg_power_factor * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_power_factor,
           (SUM(a.avg_voltage_l1 * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_voltage_l1,
           '0' AS energy_delta_kwh,
           SUM(a.reading_count)::text AS reading_count
         FROM readings_daily a
         WHERE a.bucket >= $1::date AND a.bucket <= $2::date
         GROUP BY a.bucket
         ORDER BY a.bucket ASC`,
        [query.from, query.to],
      );
    }
    return this.dataSource.query(
      `SELECT
         a.bucket::text,
         '_portfolio' AS meter_id,
         SUM(a.avg_power_kw * a.reading_count)::text AS avg_power_kw,
         MAX(a.max_power_kw)::text AS max_power_kw,
         MIN(a.min_power_kw)::text AS min_power_kw,
         (SUM(a.avg_power_factor * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_power_factor,
         (SUM(a.avg_voltage_l1 * a.reading_count) / NULLIF(SUM(a.reading_count), 0))::text AS avg_voltage_l1,
         '0' AS energy_delta_kwh,
         SUM(a.reading_count)::text AS reading_count
       FROM readings_daily a
       WHERE a.tenant_id = $1
         AND a.bucket >= $2::date AND a.bucket <= $3::date
       GROUP BY a.bucket
       ORDER BY a.bucket ASC`,
      [tenantId, query.from, query.to],
    );
  }

  /**
   * Fallback: raw time_bucket() aggregation on the readings table.
   */
  private async findFromRawBucket(
    tenantId: string,
    buildingIds: string[],
    query: AggregatedQueryDto,
    pgInterval: string,
  ): Promise<AggregatedRow[]> {
    const params: unknown[] = [pgInterval, tenantId, query.from, query.to];
    const conditions: string[] = [
      'm.tenant_id = $2',
      'r.timestamp >= $3',
      'r.timestamp <= $4',
    ];
    let paramIdx = 5;

    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${paramIdx + i}`);
      conditions.push(`m.building_id IN (${placeholders.join(', ')})`);
      params.push(...buildingIds);
      paramIdx += buildingIds.length;
    }

    if (query.buildingId) {
      conditions.push(`m.building_id = $${paramIdx}`);
      params.push(query.buildingId);
      paramIdx++;
    }

    if (query.meterId) {
      conditions.push(`m.id = $${paramIdx}`);
      params.push(query.meterId);
      paramIdx++;
    }

    const where = conditions.join(' AND ');

    return this.dataSource.query(
      `SELECT
         time_bucket($1::interval, r.timestamp) AS bucket,
         r.meter_id,
         AVG(r.power_kw::numeric)::text AS avg_power_kw,
         MAX(r.power_kw::numeric)::text AS max_power_kw,
         MIN(r.power_kw::numeric)::text AS min_power_kw,
         AVG(r.power_factor::numeric)::text AS avg_power_factor,
         AVG(r.voltage_l1::numeric)::text AS avg_voltage_l1,
         (MAX(r.energy_kwh_total::numeric) - MIN(r.energy_kwh_total::numeric))::text AS energy_delta_kwh,
         COUNT(*)::text AS reading_count
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE ${where}
       GROUP BY time_bucket($1::interval, r.timestamp), r.meter_id
       ORDER BY bucket ASC, r.meter_id ASC`,
      params,
    );
  }

  private async buildMeterScopeCheck(
    tenantId: string,
    buildingIds: string[],
    meterId: string,
  ): Promise<boolean> {
    const params: unknown[] = [meterId, tenantId];
    const conditions = ['id = $1', 'tenant_id = $2'];

    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${3 + i}`);
      conditions.push(`building_id IN (${placeholders.join(', ')})`);
      params.push(...buildingIds);
    }

    const result = await this.dataSource.query(
      `SELECT 1 FROM meters WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params,
    );

    return result.length > 0;
  }
}
