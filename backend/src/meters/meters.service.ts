import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meter } from './meter.entity';
import { Reading } from './reading.entity';
import { getMeterStatus } from './meter-status.util';

function toNullableNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function toNumberOrZero(value: unknown): number {
  return value == null ? 0 : Number(value);
}

@Injectable()
export class MetersService {
  constructor(
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
    @InjectRepository(Reading)
    private readonly readingRepo: Repository<Reading>,
  ) {}

  async findByBuilding(buildingId: string) {
    const meters = await this.meterRepo.find({ where: { buildingId }, order: { id: 'ASC' } });
    return meters.map((m) => this.withLiveStatus(m));
  }

  async findOne(id: string) {
    const meter = await this.meterRepo.findOne({ where: { id } });
    return meter ? this.withLiveStatus(meter) : null;
  }

  /** Derive status from lastReadingAt: online if < 5 min ago */
  private withLiveStatus(m: Meter) {
    m.status = getMeterStatus(m.lastReadingAt);
    return m;
  }

  async findReadings(
    meterId: string,
    resolution: 'raw' | '15min' | 'hourly' | 'daily' = 'hourly',
    from?: string,
    to?: string,
  ) {
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

  async getDowntimeEvents(meterId: string, from: string, to: string) {
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

  async getUptimeSummary(meterId: string, period: 'daily' | 'weekly' | 'monthly') {
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

  async getUptimeAll(meterId: string) {
    const [daily, weekly, monthly] = await Promise.all([
      this.getUptimeSummary(meterId, 'daily'),
      this.getUptimeSummary(meterId, 'weekly'),
      this.getUptimeSummary(meterId, 'monthly'),
    ]);
    return { daily, weekly, monthly };
  }

  async getAlarmEvents(meterId: string, from: string, to: string) {
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

  async getAlarmSummary(meterId: string, from: string, to: string) {
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

  async getOverview() {
    const rows = await this.readingRepo.query(`
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
      ORDER BY m.id ASC
    `);

    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      buildingId: r.buildingId,
      model: r.model,
      phaseType: r.phaseType,
      busId: r.busId,
      status: getMeterStatus(r.lastReadingAt as string | null),
      lastReadingAt: r.lastReadingAt,
      uptime24h: toNumberOrZero(r.uptimePercent),
      alarmCount30d: Number(r.alarmCount30d),
    }));
  }

  async findBuildingConsumption(buildingId: string, resolution: '15min' | 'hourly' | 'daily' = 'hourly', from?: string, to?: string) {
    let truncExpr: string;
    if (resolution === '15min') {
      truncExpr = `date_trunc('hour', r.timestamp) + interval '15 min' * floor(extract(minute from r.timestamp) / 15)`;
    } else if (resolution === 'daily') {
      truncExpr = `date_trunc('day', r.timestamp)`;
    } else {
      truncExpr = `date_trunc('hour', r.timestamp)`;
    }

    // Two-step aggregation: first AVG per meter per bucket (handles variable reading frequency),
    // then SUM/AVG/MAX across meters per bucket.
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
}
