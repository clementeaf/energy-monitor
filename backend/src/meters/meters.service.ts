import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meter } from './meter.entity';
import { Reading } from './reading.entity';

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
    if (m.lastReadingAt) {
      const age = Date.now() - new Date(m.lastReadingAt).getTime();
      m.status = age < 5 * 60 * 1000 ? 'online' : 'offline';
    }
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
      voltageL1: r.voltageL1 != null ? Number(r.voltageL1) : null,
      voltageL2: r.voltageL2 != null ? Number(r.voltageL2) : null,
      voltageL3: r.voltageL3 != null ? Number(r.voltageL3) : null,
      currentL1: r.currentL1 != null ? Number(r.currentL1) : null,
      currentL2: r.currentL2 != null ? Number(r.currentL2) : null,
      currentL3: r.currentL3 != null ? Number(r.currentL3) : null,
      powerKw: Number(r.powerKw),
      reactivePowerKvar: r.reactivePowerKvar != null ? Number(r.reactivePowerKvar) : null,
      powerFactor: r.powerFactor != null ? Number(r.powerFactor) : null,
      frequencyHz: r.frequencyHz != null ? Number(r.frequencyHz) : null,
      energyKwhTotal: Number(r.energyKwhTotal),
      thdVoltagePct: r.thdVoltagePct != null ? Number(r.thdVoltagePct) : null,
      thdCurrentPct: r.thdCurrentPct != null ? Number(r.thdCurrentPct) : null,
      phaseImbalancePct: r.phaseImbalancePct != null ? Number(r.phaseImbalancePct) : null,
    }));
  }

  async findBuildingConsumption(buildingId: string, resolution: 'hourly' | 'daily' = 'hourly', from?: string, to?: string) {
    const trunc = resolution === 'daily' ? 'day' : 'hour';

    // Two-step aggregation: first AVG per meter per bucket (handles variable reading frequency),
    // then SUM/AVG/MAX across meters per bucket.
    let whereClause = `m.building_id = '${buildingId.replaceAll("'", "''")}'`;
    if (from) whereClause += ` AND r.timestamp >= '${from}'`;
    if (to) whereClause += ` AND r.timestamp <= '${to}'`;

    const rows = await this.readingRepo.query(`
      SELECT
        bucket AS "timestamp",
        SUM(avg_power) AS "totalPowerKw",
        AVG(avg_power) AS "avgPowerKw",
        MAX(max_power) AS "peakPowerKw"
      FROM (
        SELECT
          date_trunc('${trunc}', r.timestamp) AS bucket,
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
    `);

    return rows.map((r: Record<string, unknown>) => ({
      timestamp: r.timestamp,
      totalPowerKw: Number(Number(r.totalPowerKw).toFixed(3)),
      avgPowerKw: Number(Number(r.avgPowerKw).toFixed(3)),
      peakPowerKw: Number(Number(r.peakPowerKw).toFixed(3)),
    }));
  }
}
