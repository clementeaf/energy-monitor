import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReadingQueryDto } from './dto/reading-query.dto';
import { LatestQueryDto } from './dto/latest-query.dto';
import { AggregatedQueryDto } from './dto/aggregated-query.dto';
import { meterRoleWhereClause } from './meter-role-sql';
import { parseQualityFilter, qualityWhereFragment } from './quality-filter-sql';
import { timeBucketExpr } from './timezone-bucket-sql';
import { CompareBuildingsQueryDto } from './dto/compare-buildings-query.dto';
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

/** Bundled compare-dashboard payload (anchor + current + previous periods). */
export interface CompareBuildingsResponse {
  anchor: string | null;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  current: AggregatedRow[];
  previous: AggregatedRow[];
}

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
  if (driverErr?.code === '55000' || driverErr?.code === '42P01') return true;
  const msg = err.message.toLowerCase();
  return msg.includes('has not been populated') || msg.includes('does not exist');
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

    const qualities = parseQualityFilter(query.quality);

    if (resolution === 'raw') {
      const params: unknown[] = [query.meterId, query.from, query.to, limit];
      let qualityClause = '';
      const qf = qualityWhereFragment('', 5, qualities);
      if (qf) {
        qualityClause = `AND ${qf.clause}`;
        params.push(...qf.params);
      }

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
           ${qualityClause}
         ORDER BY timestamp ASC
         LIMIT $4`,
        params,
      );
    } else {
      const pgInterval = RESOLUTION_MAP[resolution];
      if (!pgInterval) return [];

      const params: unknown[] = [pgInterval, query.meterId, query.from, query.to, limit];
      let qualityClause = '';
      const qf = qualityWhereFragment('', 6, qualities);
      if (qf) {
        qualityClause = `AND ${qf.clause}`;
        params.push(...qf.params);
      }

      const bucket = timeBucketExpr(pgInterval, 'timestamp', timezone, '$1::interval');
      rows = await this.dataSource.query(
        `SELECT
           ${bucket} AS timestamp,
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
           NULL AS quality,
           NULL AS source,
           NULL AS ingested_at
         FROM readings
         WHERE meter_id = $2
           AND timestamp >= $3
           AND timestamp <= $4
           ${qualityClause}
         GROUP BY ${bucket}, meter_id
         ORDER BY timestamp ASC
         LIMIT $5`,
        params,
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

    const readingConditions: string[] = [];
    if (!crossTenant) readingConditions.push('r.tenant_id = $1');

    const qualities = parseQualityFilter(query.quality);
    const qf = qualityWhereFragment('r', paramIdx, qualities);
    if (qf) {
      readingConditions.push(qf.clause);
      params.push(...qf.params);
    }

    const readingScope = readingConditions.length > 0
      ? `WHERE ${readingConditions.join(' AND ')}`
      : '';

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
       LEFT JOIN (
         SELECT DISTINCT ON (r.meter_id)
           r.meter_id,
           r.timestamp,
           r.power_kw,
           r.energy_kwh_total,
           r.voltage_l1,
           r.current_l1,
           r.power_factor,
           r.frequency_hz
         FROM readings r
         ${readingScope}
         ORDER BY r.meter_id, r.timestamp DESC
       ) lr ON lr.meter_id = m.id
       ${whereClause}
       ORDER BY m.name`,
      params,
    );

    return rows.map((row) => enrichLatestRow(row));
  }

  /**
   * Returns the newest reading timestamp for the tenant (fast anchor for dashboard charts).
   * Prefers readings_daily MAX(bucket); falls back to raw readings MAX(timestamp).
   */
  async findLatestAnchor(
    tenantId: string,
    buildingIds: string[],
    crossTenant = false,
  ): Promise<{ timestamp: string | null }> {
    const dailyTs = await this.maxBucketFromDaily(tenantId, buildingIds, crossTenant);
    if (dailyTs) return { timestamp: dailyTs };

    const params: unknown[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (!crossTenant) {
      conditions.push(`r.tenant_id = $${paramIdx}`);
      params.push(tenantId);
      paramIdx++;
    }

    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${paramIdx + i}`);
      conditions.push(`r.meter_id IN (SELECT id FROM meters WHERE building_id IN (${placeholders.join(', ')}))`);
      params.push(...buildingIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows: { timestamp: string | null }[] = await this.dataSource.query(
      `SELECT MAX(r.timestamp)::text AS timestamp FROM readings r ${whereClause}`,
      params,
    );
    return { timestamp: rows[0]?.timestamp ?? null };
  }

  /**
   * Fast anchor from readings_daily continuous aggregate.
   */
  private async maxBucketFromDaily(
    tenantId: string,
    buildingIds: string[],
    crossTenant: boolean,
  ): Promise<string | null> {
    const params: unknown[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (!crossTenant) {
      conditions.push(`a.tenant_id = $${paramIdx}`);
      params.push(tenantId);
      paramIdx++;
    }

    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${paramIdx + i}`);
      conditions.push(`a.meter_id IN (SELECT id FROM meters WHERE building_id IN (${placeholders.join(', ')}))`);
      params.push(...buildingIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows: { timestamp: string | null }[] = await this.dataSource.query(
      `SELECT MAX(a.bucket)::text AS timestamp FROM readings_daily a ${whereClause}`,
      params,
    );
    return rows[0]?.timestamp ?? null;
  }

  /**
   * Compare dashboard bundle: anchor + daily building aggregates for current and previous periods.
   * @param tenantId - Tenant scope
   * @param buildingIds - RBAC building filter
   * @param days - Window length (1, 7, or 30)
   * @param crossTenant - Super-admin cross-tenant flag
   * @returns Anchor timestamp and aggregated rows for both periods
   */
  async findCompareBuildings(
    tenantId: string,
    buildingIds: string[],
    days: number,
    crossTenant = false,
  ): Promise<CompareBuildingsResponse> {
    const { timestamp: anchor } = await this.findLatestAnchor(tenantId, buildingIds, crossTenant);
    const { from, to } = this.dateRangeFromDays(days, anchor);
    const { from: previousFrom, to: previousTo } = this.previousPeriodRange(from, to);

    const baseQuery = { interval: 'daily' as const, groupBy: 'building' as const };
    const [current, previous] = await Promise.all([
      this.findAggregated(tenantId, buildingIds, { ...baseQuery, from, to }, crossTenant),
      this.findAggregated(
        tenantId,
        buildingIds,
        { ...baseQuery, from: previousFrom, to: previousTo },
        crossTenant,
      ),
    ]);

    return {
      anchor,
      from,
      to,
      previousFrom,
      previousTo,
      current,
      previous,
    };
  }

  /**
   * Rango ISO [from, to] de N días terminando en anchor (o now si null).
   */
  private dateRangeFromDays(
    days: number,
    anchorIso: string | null,
  ): { from: string; to: string } {
    const end = anchorIso ? new Date(anchorIso) : new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  /**
   * Periodo anterior con la misma duración que [from, to].
   */
  private previousPeriodRange(fromIso: string, toIso: string): { from: string; to: string } {
    const startMs = new Date(fromIso).getTime();
    const endMs = new Date(toIso).getTime();
    const durationMs = endMs - startMs;
    const prevEndMs = startMs - 1;
    const prevStartMs = prevEndMs - durationMs;
    return {
      from: new Date(prevStartMs).toISOString(),
      to: new Date(prevEndMs).toISOString(),
    };
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

    // Portfolio / building cache — avoids slow sequential scans on continuous aggregates
    if (query.groupBy === 'portfolio' || query.groupBy === 'building') {
      const scopeKey = buildingIds.length > 0 ? buildingIds.slice().sort().join(',') : '_all';
      const cacheKey = `${query.groupBy}:${crossTenant ? '_xt' : tenantId}:${scopeKey}:${query.interval}:${query.from}:${query.to}:${query.meterRole ?? ''}`;
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

    // JOIN meters when filtering by building or meter role
    const needsMeterJoin = buildingIds.length > 0 || !!query.buildingId || !!query.meterRole;
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

    if (query.meterRole) {
      conditions.push(meterRoleWhereClause(query.meterRole as 'generation' | 'load'));
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
      if (agg.view === 'readings_hourly') {
        return this.findPortfolioHourly(tenantId, query, crossTenant);
      }
      return this.findPortfolioDaily(tenantId, query, crossTenant);
    }

    if (query.groupBy === 'building' && agg.view === 'readings_daily' && !agg.reBucket && !query.meterRole) {
      return this.findBuildingDaily(tenantId, buildingIds, query, crossTenant);
    }

    // groupBy=building (monthly re-bucket): aggregate per building from daily CAGG
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
   * Building daily aggregate — prefers building_summary matview, falls back to readings_daily JOIN.
   */
  private async findBuildingDaily(
    tenantId: string,
    buildingIds: string[],
    query: AggregatedQueryDto,
    crossTenant: boolean,
  ): Promise<AggregatedRow[]> {
    let rows: AggregatedRow[] = [];
    try {
      rows = await this.queryBuildingSummary(tenantId, buildingIds, query, crossTenant);
    } catch (err) {
      if (!isUnpopulatedMatviewError(err)) throw err;
    }
    if (rows.length > 0) return rows;
    return this.queryBuildingFromDaily(tenantId, buildingIds, query, crossTenant);
  }

  /**
   * Reads pre-computed building_summary materialized view (~5ms when populated).
   */
  private async queryBuildingSummary(
    tenantId: string,
    buildingIds: string[],
    query: AggregatedQueryDto,
    crossTenant: boolean,
  ): Promise<AggregatedRow[]> {
    const params: unknown[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (!crossTenant) {
      params.push(tenantId);
      conditions.push(`bs.tenant_id = $${paramIdx}`);
      paramIdx++;
    }

    params.push(query.from, query.to);
    conditions.push(`bs.bucket >= $${paramIdx}::date`, `bs.bucket <= $${paramIdx + 1}::date`);
    paramIdx += 2;

    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${paramIdx + i}`);
      conditions.push(`bs.building_id IN (${placeholders.join(', ')})`);
      params.push(...buildingIds);
      paramIdx += buildingIds.length;
    }

    if (query.buildingId) {
      conditions.push(`bs.building_id = $${paramIdx}`);
      params.push(query.buildingId);
      paramIdx++;
    }

    const where = conditions.join(' AND ');
    return this.dataSource.query(
      `SELECT
         bs.bucket::text,
         bs.building_id::text AS meter_id,
         bs.sum_power_kw::text AS avg_power_kw,
         bs.max_power_kw::text AS max_power_kw,
         bs.min_power_kw::text AS min_power_kw,
         bs.avg_power_factor::text AS avg_power_factor,
         bs.avg_voltage_l1::text AS avg_voltage_l1,
         COALESCE(bs.sum_energy_kwh, 0)::text AS energy_delta_kwh,
         bs.reading_count::text AS reading_count
       FROM building_summary bs
       WHERE ${where}
       ORDER BY bs.bucket ASC, bs.building_id ASC`,
      params,
    );
  }

  /**
   * Live building aggregate from readings_daily when building_summary is empty.
   */
  private async queryBuildingFromDaily(
    tenantId: string,
    buildingIds: string[],
    query: AggregatedQueryDto,
    crossTenant: boolean,
  ): Promise<AggregatedRow[]> {
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

    const meterJoin = 'INNER JOIN meters m ON m.id = a.meter_id';

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

    const where = conditions.join(' AND ');
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
       FROM readings_daily a
       ${meterJoin}
       WHERE ${where}
       GROUP BY a.bucket, m.building_id
       ORDER BY a.bucket ASC, m.building_id ASC`,
      params,
    );
  }

  /**
   * Portfolio daily aggregate — prefers portfolio_summary matview, falls back to readings_daily then raw.
   */
  private async findPortfolioDaily(
    tenantId: string,
    query: AggregatedQueryDto,
    crossTenant: boolean,
  ): Promise<AggregatedRow[]> {
    let rows: AggregatedRow[] = [];
    try {
      rows = await this.queryPortfolioSummary(tenantId, query, crossTenant);
    } catch (err) {
      if (!isUnpopulatedMatviewError(err)) throw err;
    }
    if (rows.length > 0) return rows;

    return this.queryPortfolioFromDaily(tenantId, query, crossTenant);
  }

  /**
   * Portfolio hourly aggregate — prefers readings_hourly CAGG, falls back to raw readings.
   */
  private async findPortfolioHourly(
    tenantId: string,
    query: AggregatedQueryDto,
    crossTenant: boolean,
  ): Promise<AggregatedRow[]> {
    return this.queryPortfolioFromHourly(tenantId, query, crossTenant);
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
           ps.bucket::text,
           '_portfolio' AS meter_id,
           SUM(ps.sum_power_kw)::text AS avg_power_kw,
           MAX(ps.max_power_kw)::text AS max_power_kw,
           MIN(ps.min_power_kw)::text AS min_power_kw,
           (SUM(ps.avg_power_factor * ps.reading_count) / NULLIF(SUM(ps.reading_count), 0))::text AS avg_power_factor,
           (SUM(ps.avg_voltage_l1 * ps.reading_count) / NULLIF(SUM(ps.reading_count), 0))::text AS avg_voltage_l1,
           COALESCE(SUM(ps.sum_energy_kwh), 0)::text AS energy_delta_kwh,
           SUM(ps.reading_count)::text AS reading_count
         FROM portfolio_summary ps
         WHERE ps.bucket >= $1::date AND ps.bucket <= $2::date
         GROUP BY ps.bucket
         ORDER BY ps.bucket ASC`,
        [query.from, query.to],
      );
    }
    return this.dataSource.query(
      `SELECT
         ps.bucket::text,
         '_portfolio' AS meter_id,
         ps.sum_power_kw::text AS avg_power_kw,
         ps.max_power_kw::text AS max_power_kw,
         ps.min_power_kw::text AS min_power_kw,
         ps.avg_power_factor::text AS avg_power_factor,
         ps.avg_voltage_l1::text AS avg_voltage_l1,
         COALESCE(ps.sum_energy_kwh, 0)::text AS energy_delta_kwh,
         ps.reading_count::text AS reading_count
       FROM portfolio_summary ps
       WHERE ps.tenant_id = $1
         AND ps.bucket >= $2::date AND ps.bucket <= $3::date
       ORDER BY ps.bucket ASC`,
      [tenantId, query.from, query.to],
    );
  }

  /**
   * Portfolio hourly aggregate from readings_hourly continuous aggregate.
   */
  private async queryPortfolioFromHourly(
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
           SUM(a.max_energy_kwh_total - a.min_energy_kwh_total)::text AS energy_delta_kwh,
           SUM(a.reading_count)::text AS reading_count
         FROM readings_hourly a
         WHERE a.bucket >= $1 AND a.bucket <= $2
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
         SUM(a.max_energy_kwh_total - a.min_energy_kwh_total)::text AS energy_delta_kwh,
         SUM(a.reading_count)::text AS reading_count
       FROM readings_hourly a
       WHERE a.tenant_id = $1
         AND a.bucket >= $2 AND a.bucket <= $3
       GROUP BY a.bucket
       ORDER BY a.bucket ASC`,
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
           SUM(a.max_energy_kwh_total - a.min_energy_kwh_total)::text AS energy_delta_kwh,
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
         SUM(a.max_energy_kwh_total - a.min_energy_kwh_total)::text AS energy_delta_kwh,
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
   * Live portfolio aggregate from raw readings when continuous aggregates are empty.
   */
  private async queryPortfolioFromRaw(
    tenantId: string,
    query: AggregatedQueryDto,
    crossTenant: boolean,
    pgInterval: string,
  ): Promise<AggregatedRow[]> {
    assertSafeInterval(pgInterval);
    await this.dataSource.query("SET LOCAL statement_timeout = '15s'");
    try {
    if (crossTenant) {
      return await this.dataSource.query(
        `SELECT
           sub.bucket::text,
           '_portfolio' AS meter_id,
           SUM(sub.avg_power_kw)::text AS avg_power_kw,
           MAX(sub.max_power_kw)::text AS max_power_kw,
           MIN(sub.min_power_kw)::text AS min_power_kw,
           (SUM(sub.avg_power_factor * sub.reading_count) / NULLIF(SUM(sub.reading_count), 0))::text AS avg_power_factor,
           (SUM(sub.avg_voltage_l1 * sub.reading_count) / NULLIF(SUM(sub.reading_count), 0))::text AS avg_voltage_l1,
           SUM(sub.energy_delta_kwh)::text AS energy_delta_kwh,
           SUM(sub.reading_count)::text AS reading_count
         FROM (
           SELECT
             time_bucket($1::interval, r.timestamp) AS bucket,
             r.meter_id,
             AVG(r.power_kw::numeric) AS avg_power_kw,
             MAX(r.power_kw::numeric) AS max_power_kw,
             MIN(r.power_kw::numeric) AS min_power_kw,
             AVG(r.power_factor::numeric) AS avg_power_factor,
             AVG(r.voltage_l1::numeric) AS avg_voltage_l1,
             (MAX(r.energy_kwh_total::numeric) - MIN(r.energy_kwh_total::numeric)) AS energy_delta_kwh,
             COUNT(*)::bigint AS reading_count
           FROM readings r
           WHERE r.timestamp >= $2 AND r.timestamp <= $3
           GROUP BY time_bucket($1::interval, r.timestamp), r.meter_id
         ) sub
         GROUP BY sub.bucket
         ORDER BY sub.bucket ASC`,
        [pgInterval, query.from, query.to],
      );
    }
    return await this.dataSource.query(
      `SELECT
         sub.bucket::text,
         '_portfolio' AS meter_id,
         SUM(sub.avg_power_kw)::text AS avg_power_kw,
         MAX(sub.max_power_kw)::text AS max_power_kw,
         MIN(sub.min_power_kw)::text AS min_power_kw,
         (SUM(sub.avg_power_factor * sub.reading_count) / NULLIF(SUM(sub.reading_count), 0))::text AS avg_power_factor,
         (SUM(sub.avg_voltage_l1 * sub.reading_count) / NULLIF(SUM(sub.reading_count), 0))::text AS avg_voltage_l1,
         SUM(sub.energy_delta_kwh)::text AS energy_delta_kwh,
         SUM(sub.reading_count)::text AS reading_count
       FROM (
         SELECT
           time_bucket($1::interval, r.timestamp) AS bucket,
           r.meter_id,
           AVG(r.power_kw::numeric) AS avg_power_kw,
           MAX(r.power_kw::numeric) AS max_power_kw,
           MIN(r.power_kw::numeric) AS min_power_kw,
           AVG(r.power_factor::numeric) AS avg_power_factor,
           AVG(r.voltage_l1::numeric) AS avg_voltage_l1,
           (MAX(r.energy_kwh_total::numeric) - MIN(r.energy_kwh_total::numeric)) AS energy_delta_kwh,
           COUNT(*)::bigint AS reading_count
         FROM readings r
         INNER JOIN meters m ON m.id = r.meter_id
         WHERE m.tenant_id = $2
           AND r.timestamp >= $3 AND r.timestamp <= $4
         GROUP BY time_bucket($1::interval, r.timestamp), r.meter_id
       ) sub
       GROUP BY sub.bucket
       ORDER BY sub.bucket ASC`,
      [pgInterval, tenantId, query.from, query.to],
    );
    } finally {
      await this.dataSource.query("SET LOCAL statement_timeout = '0'");
    }
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

    if (query.meterRole) {
      conditions.push(meterRoleWhereClause(query.meterRole as 'generation' | 'load'));
    }

    const where = conditions.join(' AND ');

    await this.dataSource.query("SET LOCAL statement_timeout = '15s'");
    try {
      return await this.dataSource.query(
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
    } finally {
      await this.dataSource.query("SET LOCAL statement_timeout = '0'");
    }
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
