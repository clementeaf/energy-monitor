import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Meter } from './meter.entity';
import { Reading } from './reading.entity';
import { getMeterStatus } from './meter-status.util';
import { getScopedSiteIds, hasSiteAccess, type AccessScope } from '../auth/access-scope';
import {
  useStaging,
  STAGING_LIMITS,
  clampStagingLimit,
} from '../readings-source.config';

function toNullableNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function toNumberOrZero(value: unknown): number {
  return value == null ? 0 : Number(value);
}

/** Máximo rango en días para validar from/to cuando se usa staging. */
function getMaxRangeDaysMs(): number {
  return STAGING_LIMITS.maxRangeDays * 24 * 60 * 60 * 1000;
}

@Injectable()
export class MetersService {
  constructor(
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
    @InjectRepository(Reading)
    private readonly readingRepo: Repository<Reading>,
    private readonly dataSource: DataSource,
  ) {}

  private async findAccessibleMeterEntity(id: string, scope: AccessScope) {
    const meter = await this.meterRepo.findOne({ where: { id } });
    if (!meter) return null;
    return hasSiteAccess(scope, meter.buildingId) ? meter : null;
  }

  async findByBuilding(buildingId: string, scope: AccessScope) {
    if (!hasSiteAccess(scope, buildingId)) return null;

    const meters = await this.meterRepo.find({ where: { buildingId }, order: { id: 'ASC' } });
    return meters.map((m) => this.withLiveStatus(m));
  }

  async findOne(id: string, scope: AccessScope) {
    const meter = await this.findAccessibleMeterEntity(id, scope);
    return meter ? this.withLiveStatus(meter) : null;
  }

  /** Derive status from lastReadingAt: online if < 5 min ago */
  private withLiveStatus(m: Meter) {
    m.status = getMeterStatus(m.lastReadingAt);
    return m;
  }

  /**
   * Lee desde readings_import_staging con límite de filas y from/to obligatorios.
   * Devuelve el mismo formato que findReadings (thd/alarm null; staging no los tiene).
   */
  private async findReadingsFromStaging(
    meterId: string,
    resolution: 'raw' | '15min' | 'hourly' | 'daily',
    from: string,
    to: string,
    limit: number,
  ): Promise<unknown[]> {
    const cap = Math.min(limit, STAGING_LIMITS.maxRowsPerQuery);
    if (resolution === 'raw') {
      const rows = await this.dataSource.query(
        `SELECT timestamp, voltage_l1, voltage_l2, voltage_l3, current_l1, current_l2, current_l3,
                power_kw, reactive_power_kvar, power_factor, frequency_hz, energy_kwh_total
         FROM readings_import_staging
         WHERE meter_id = $1 AND timestamp >= $2 AND timestamp <= $3
         ORDER BY timestamp ASC
         LIMIT $4`,
        [meterId, from, to, cap],
      );
      return rows.map((r: Record<string, unknown>) => ({
        timestamp: r.timestamp,
        voltageL1: toNullableNumber(r.voltage_l1),
        voltageL2: toNullableNumber(r.voltage_l2),
        voltageL3: toNullableNumber(r.voltage_l3),
        currentL1: toNullableNumber(r.current_l1),
        currentL2: toNullableNumber(r.current_l2),
        currentL3: toNullableNumber(r.current_l3),
        powerKw: Number(r.power_kw),
        reactivePowerKvar: toNullableNumber(r.reactive_power_kvar),
        powerFactor: toNullableNumber(r.power_factor),
        frequencyHz: toNullableNumber(r.frequency_hz),
        energyKwhTotal: Number(r.energy_kwh_total),
        thdVoltagePct: null,
        thdCurrentPct: null,
        phaseImbalancePct: null,
      }));
    }
    const trunc = resolution === 'daily' ? 'day' : resolution === '15min' ? 'hour' : 'hour';
    const truncExpr =
      resolution === '15min'
        ? `date_trunc('hour', r.timestamp) + interval '15 min' * floor(extract(minute from r.timestamp) / 15)`
        : `date_trunc('${trunc}', r.timestamp)`;
    const rows = await this.dataSource.query(
      `SELECT ${truncExpr} AS timestamp,
              AVG(r.voltage_l1) AS "voltageL1", AVG(r.voltage_l2) AS "voltageL2", AVG(r.voltage_l3) AS "voltageL3",
              AVG(r.current_l1) AS "currentL1", AVG(r.current_l2) AS "currentL2", AVG(r.current_l3) AS "currentL3",
              AVG(r.power_kw) AS "powerKw", AVG(r.reactive_power_kvar) AS "reactivePowerKvar",
              AVG(r.power_factor) AS "powerFactor", AVG(r.frequency_hz) AS "frequencyHz",
              MAX(r.energy_kwh_total) AS "energyKwhTotal"
       FROM (
         SELECT * FROM readings_import_staging
         WHERE meter_id = $1 AND timestamp >= $2 AND timestamp <= $3
         ORDER BY timestamp ASC
         LIMIT $4
       ) r
       GROUP BY 1 ORDER BY 1 ASC`,
      [meterId, from, to, cap],
    );
    return rows.map((r: Record<string, unknown>) => ({
      timestamp: r.timestamp,
      voltageL1: toNullableNumber(r.voltageL1),
      voltageL2: toNullableNumber(r.voltageL2),
      voltageL3: toNullableNumber(r.voltageL3),
      currentL1: toNullableNumber(r.currentL1),
      currentL2: toNullableNumber(r.currentL2),
      currentL3: toNullableNumber(r.currentL3),
      powerKw: Number(r.powerKw),
      reactivePowerKvar: toNullableNumber(r.reactivePowerKvar),
      powerFactor: toNullableNumber(r.powerFactor),
      frequencyHz: toNullableNumber(r.frequencyHz),
      energyKwhTotal: Number(r.energyKwhTotal),
      thdVoltagePct: null,
      thdCurrentPct: null,
      phaseImbalancePct: null,
    }));
  }

  async findReadings(
    meterId: string,
    scope: AccessScope,
    resolution: 'raw' | '15min' | 'hourly' | 'daily' = 'hourly',
    from?: string,
    to?: string,
    limitParam?: number,
  ) {
    const meter = await this.findAccessibleMeterEntity(meterId, scope);
    if (!meter) return null;

    if (useStaging()) {
      if (!from || !to) return null;
      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();
      if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs <= fromMs) return null;
      if (toMs - fromMs > getMaxRangeDaysMs()) return null;
      const limit = clampStagingLimit(limitParam);
      return this.findReadingsFromStaging(meterId, resolution, from, to, limit);
    }

    if (resolution === 'raw') {
      const qb = this.readingRepo.createQueryBuilder('r')
        .where('r.meter_id = :meterId', { meterId });
      if (from) qb.andWhere('r.timestamp >= :from', { from });
      if (to) qb.andWhere('r.timestamp <= :to', { to });
      const rows = await qb.orderBy('r.timestamp', 'DESC').take(2000).getMany();
      return rows.reverse();
    }

    // 15-min buckets: Postgres has no date_trunc for 15min, so compute manually
    let truncExpr: string;
    if (resolution === '15min') {
      truncExpr = `date_trunc('hour', r.timestamp) + interval '15 min' * floor(extract(minute from r.timestamp) / 15)`;
    } else if (resolution === 'daily') {
      truncExpr = `date_trunc('day', r.timestamp)`;
    } else {
      truncExpr = `date_trunc('hour', r.timestamp)`;
    }

    const qb = this.readingRepo
      .createQueryBuilder('r')
      .select(truncExpr, 'timestamp')
      .addSelect('AVG(r.voltage_l1)', 'voltageL1')
      .addSelect('AVG(r.voltage_l2)', 'voltageL2')
      .addSelect('AVG(r.voltage_l3)', 'voltageL3')
      .addSelect('AVG(r.current_l1)', 'currentL1')
      .addSelect('AVG(r.current_l2)', 'currentL2')
      .addSelect('AVG(r.current_l3)', 'currentL3')
      .addSelect('AVG(r.power_kw)', 'powerKw')
      .addSelect('AVG(r.reactive_power_kvar)', 'reactivePowerKvar')
      .addSelect('AVG(r.power_factor)', 'powerFactor')
      .addSelect('AVG(r.frequency_hz)', 'frequencyHz')
      .addSelect('MAX(r.energy_kwh_total)', 'energyKwhTotal')
      .addSelect('AVG(r.thd_voltage_pct)', 'thdVoltagePct')
      .addSelect('AVG(r.thd_current_pct)', 'thdCurrentPct')
      .addSelect('AVG(r.phase_imbalance_pct)', 'phaseImbalancePct')
      .where('r.meter_id = :meterId', { meterId });
    if (from) qb.andWhere('r.timestamp >= :from', { from });
    if (to) qb.andWhere('r.timestamp <= :to', { to });
    const rows = await qb
      .groupBy('1')
      .orderBy('1', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      timestamp: r.timestamp,
      voltageL1: toNullableNumber(r.voltageL1),
      voltageL2: toNullableNumber(r.voltageL2),
      voltageL3: toNullableNumber(r.voltageL3),
      currentL1: toNullableNumber(r.currentL1),
      currentL2: toNullableNumber(r.currentL2),
      currentL3: toNullableNumber(r.currentL3),
      powerKw: Number(r.powerKw),
      reactivePowerKvar: toNullableNumber(r.reactivePowerKvar),
      powerFactor: toNullableNumber(r.powerFactor),
      frequencyHz: toNullableNumber(r.frequencyHz),
      energyKwhTotal: Number(r.energyKwhTotal),
      thdVoltagePct: toNullableNumber(r.thdVoltagePct),
      thdCurrentPct: toNullableNumber(r.thdCurrentPct),
      phaseImbalancePct: toNullableNumber(r.phaseImbalancePct),
    }));
  }

  async getDowntimeEvents(
    meterId: string,
    scope: AccessScope,
    from: string,
    to: string,
  ) {
    const meter = await this.findAccessibleMeterEntity(meterId, scope);
    if (!meter) return null;

    const rows = await this.readingRepo.query(
      `WITH ordered AS (
        SELECT timestamp,
          LAG(timestamp) OVER (ORDER BY timestamp) AS prev_ts
        FROM readings
        WHERE meter_id = $1 AND timestamp >= $2 AND timestamp <= $3
      )
      SELECT
        prev_ts AS "downtimeStart",
        timestamp AS "downtimeEnd",
        EXTRACT(EPOCH FROM (timestamp - prev_ts)) AS "durationSeconds"
      FROM ordered
      WHERE timestamp - prev_ts > interval '90 minutes'
      ORDER BY prev_ts ASC`,
      [meterId, from, to],
    );
    return rows.map((r: Record<string, unknown>) => ({
      downtimeStart: r.downtimeStart,
      downtimeEnd: r.downtimeEnd,
      durationSeconds: Number(r.durationSeconds),
    }));
  }

  async getUptimeSummary(
    meterId: string,
    scope: AccessScope,
    period: 'daily' | 'weekly' | 'monthly',
  ) {
    const meter = await this.findAccessibleMeterEntity(meterId, scope);
    if (!meter) return null;

    const intervalMap = { daily: '24 hours', weekly: '7 days', monthly: '30 days' };
    const iv = intervalMap[period];

    const [row] = await this.readingRepo.query(
      `WITH ordered AS (
        SELECT timestamp,
          LAG(timestamp) OVER (ORDER BY timestamp) AS prev_ts
        FROM readings
        WHERE meter_id = $1 AND timestamp >= NOW() - interval '${iv}'
      ),
      gaps AS (
        SELECT EXTRACT(EPOCH FROM (timestamp - prev_ts)) AS gap_seconds
        FROM ordered
        WHERE timestamp - prev_ts > interval '90 minutes'
      )
      SELECT
        EXTRACT(EPOCH FROM interval '${iv}') AS "totalSeconds",
        COALESCE(SUM(gap_seconds), 0) AS "downtimeSeconds",
        COUNT(*) AS "downtimeEvents"
      FROM gaps`,
      [meterId],
    );

    const totalSeconds = Number(row.totalSeconds);
    const downtimeSeconds = Number(row.downtimeSeconds);
    const uptimePercent = totalSeconds > 0
      ? Number((((totalSeconds - downtimeSeconds) / totalSeconds) * 100).toFixed(2))
      : 0;

    return {
      period,
      totalSeconds,
      uptimeSeconds: totalSeconds - downtimeSeconds,
      downtimeSeconds,
      uptimePercent,
      downtimeEvents: Number(row.downtimeEvents),
    };
  }

  async getUptimeAll(meterId: string, scope: AccessScope) {
    const meter = await this.findAccessibleMeterEntity(meterId, scope);
    if (!meter) return null;

    const [daily, weekly, monthly] = await Promise.all([
      this.getUptimeSummary(meterId, scope, 'daily'),
      this.getUptimeSummary(meterId, scope, 'weekly'),
      this.getUptimeSummary(meterId, scope, 'monthly'),
    ]);
    return { daily, weekly, monthly };
  }

  async getAlarmEvents(
    meterId: string,
    scope: AccessScope,
    from: string,
    to: string,
  ) {
    const meter = await this.findAccessibleMeterEntity(meterId, scope);
    if (!meter) return null;

    const rows = await this.readingRepo.query(
      `SELECT timestamp, alarm,
              voltage_l1 AS "voltageL1",
              current_l1 AS "currentL1",
              power_factor AS "powerFactor",
              thd_current_pct AS "thdCurrentPct",
              modbus_crc_errors AS "modbusCrcErrors"
       FROM readings
       WHERE meter_id = $1 AND timestamp >= $2 AND timestamp <= $3
         AND alarm IS NOT NULL AND alarm != ''
       ORDER BY timestamp ASC`,
      [meterId, from, to],
    );
    return rows.map((r: Record<string, unknown>) => ({
      timestamp: r.timestamp,
      alarm: r.alarm,
      voltageL1: toNullableNumber(r.voltageL1),
      currentL1: toNullableNumber(r.currentL1),
      powerFactor: toNullableNumber(r.powerFactor),
      thdCurrentPct: toNullableNumber(r.thdCurrentPct),
      modbusCrcErrors: toNullableNumber(r.modbusCrcErrors),
    }));
  }

  async getAlarmSummary(
    meterId: string,
    scope: AccessScope,
    from: string,
    to: string,
  ) {
    const meter = await this.findAccessibleMeterEntity(meterId, scope);
    if (!meter) return null;

    const rows = await this.readingRepo.query(
      `SELECT alarm, COUNT(*)::int AS count
       FROM readings
       WHERE meter_id = $1 AND timestamp >= $2 AND timestamp <= $3
         AND alarm IS NOT NULL AND alarm != ''
       GROUP BY alarm ORDER BY count DESC`,
      [meterId, from, to],
    );
    const total = rows.reduce((s: number, r: { count: number }) => s + r.count, 0);
    return { total, byType: rows };
  }

  /**
   * Overview de medidores. No selecciona store_type/store_name para compatibilidad con BD sin migración 013.
   */
  async getOverview(scope: AccessScope) {
    const scopedSiteIds = getScopedSiteIds(scope);
    const whereClause = scopedSiteIds ? 'WHERE m.building_id = ANY($1)' : '';
    const rows = await this.dataSource.query(
      `
      SELECT
        m.id,
        m.building_id AS "buildingId",
        m.model,
        m.phase_type AS "phaseType",
        m.bus_id AS "busId",
        m.last_reading_at AS "lastReadingAt",
        COALESCE(alarm_counts.cnt, 0)::int AS "alarmCount30d",
        uptime_calc."uptimePercent"
      FROM meters m
      LEFT JOIN (
        SELECT meter_id, COUNT(*) AS cnt
        FROM readings
        WHERE alarm IS NOT NULL AND alarm != ''
          AND timestamp >= NOW() - interval '30 days'
        GROUP BY meter_id
      ) alarm_counts ON alarm_counts.meter_id = m.id
      LEFT JOIN LATERAL (
        SELECT
          CASE WHEN EXTRACT(EPOCH FROM interval '24 hours') > 0
            THEN ROUND(((EXTRACT(EPOCH FROM interval '24 hours') - COALESCE(gap_sum, 0)) / EXTRACT(EPOCH FROM interval '24 hours')) * 100, 2)
            ELSE 0
          END AS "uptimePercent"
        FROM (
          SELECT SUM(EXTRACT(EPOCH FROM (ts - prev_ts))) AS gap_sum
          FROM (
            SELECT timestamp AS ts,
              LAG(timestamp) OVER (ORDER BY timestamp) AS prev_ts
            FROM readings
            WHERE meter_id = m.id AND timestamp >= NOW() - interval '24 hours'
          ) gaps
          WHERE ts - prev_ts > interval '90 minutes'
        ) g
      ) uptime_calc ON true
      ${whereClause}
      ORDER BY m.id ASC
    `,
      scopedSiteIds ? [scopedSiteIds] : [],
    );

    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      buildingId: r.buildingId,
      model: r.model,
      phaseType: r.phaseType,
      busId: r.busId,
      storeType: null as string | null,
      storeName: null as string | null,
      status: getMeterStatus(r.lastReadingAt as string | null),
      lastReadingAt: r.lastReadingAt,
      uptime24h: toNumberOrZero(r.uptimePercent),
      alarmCount30d: Number(r.alarmCount30d),
    }));
  }

  async findBuildingConsumption(
    buildingId: string,
    scope: AccessScope,
    resolution: '15min' | 'hourly' | 'daily' = 'hourly',
    from?: string,
    to?: string,
  ) {
    if (!hasSiteAccess(scope, buildingId)) return null;

    if (useStaging()) {
      if (!from || !to) return null;
      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();
      if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs <= fromMs) return null;
      if (toMs - fromMs > getMaxRangeDaysMs()) return null;
      return this.findBuildingConsumptionFromStaging(buildingId, resolution, from, to);
    }

    let truncExpr: string;
    if (resolution === '15min') {
      truncExpr = `date_trunc('hour', r.timestamp) + interval '15 min' * floor(extract(minute from r.timestamp) / 15)`;
    } else if (resolution === 'daily') {
      truncExpr = `date_trunc('day', r.timestamp)`;
    } else {
      truncExpr = `date_trunc('hour', r.timestamp)`;
    }

    const conditions = ['m.building_id = $1'];
    const params: Array<string> = [buildingId];
    if (from) {
      params.push(from);
      conditions.push(`r.timestamp >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`r.timestamp <= $${params.length}`);
    }
    const whereClause = conditions.join(' AND ');

    const rows = await this.readingRepo.query(`
      SELECT
        bucket AS "timestamp",
        SUM(avg_power) AS "totalPowerKw",
        AVG(avg_power) AS "avgPowerKw",
        MAX(max_power) AS "peakPowerKw"
      FROM (
        SELECT
          ${truncExpr} AS bucket,
          r.meter_id,
          AVG(r.power_kw) AS avg_power,
          MAX(r.power_kw) AS max_power
        FROM readings r
        INNER JOIN meters m ON m.id = r.meter_id
        WHERE ${whereClause}
        GROUP BY bucket, r.meter_id
      ) sub
      GROUP BY bucket
      ORDER BY bucket ASC
    `, params);

    return rows.map((r: Record<string, unknown>) => ({
      timestamp: r.timestamp,
      totalPowerKw: Number(Number(r.totalPowerKw).toFixed(3)),
      avgPowerKw: Number(Number(r.avgPowerKw).toFixed(3)),
      peakPowerKw: Number(Number(r.peakPowerKw).toFixed(3)),
    }));
  }

  /**
   * Consumo por edificio desde readings_import_staging. Solo medidores del edificio; límite interno.
   */
  private async findBuildingConsumptionFromStaging(
    buildingId: string,
    resolution: '15min' | 'hourly' | 'daily',
    from: string,
    to: string,
  ): Promise<Array<{ timestamp: string; totalPowerKw: number; avgPowerKw: number; peakPowerKw: number }>> {
    const truncExpr =
      resolution === '15min'
        ? `date_trunc('hour', r.timestamp) + interval '15 min' * floor(extract(minute from r.timestamp) / 15)`
        : resolution === 'daily'
          ? `date_trunc('day', r.timestamp)`
          : `date_trunc('hour', r.timestamp)`;
    const cap = STAGING_LIMITS.defaultMaxRows * 3;
    const rows = await this.dataSource.query(
      `WITH building_meters AS (
         SELECT id FROM meters WHERE building_id = $1
       ),
       capped AS (
         SELECT r.timestamp, r.power_kw
         FROM readings_import_staging r
         INNER JOIN building_meters m ON m.id = r.meter_id
         WHERE r.timestamp >= $2 AND r.timestamp <= $3
         ORDER BY r.timestamp ASC
         LIMIT $4
       )
       SELECT
         ${truncExpr} AS "timestamp",
         SUM(r.power_kw)::double precision AS "totalPowerKw",
         AVG(r.power_kw)::double precision AS "avgPowerKw",
         MAX(r.power_kw)::double precision AS "peakPowerKw"
       FROM capped r
       GROUP BY 1 ORDER BY 1 ASC`,
      [buildingId, from, to, cap],
    );
    return rows.map((r: Record<string, unknown>) => ({
      timestamp: String(r.timestamp),
      totalPowerKw: Number(Number(r.totalPowerKw ?? 0).toFixed(3)),
      avgPowerKw: Number(Number(r.avgPowerKw ?? 0).toFixed(3)),
      peakPowerKw: Number(Number(r.peakPowerKw ?? 0).toFixed(3)),
    }));
  }
}
