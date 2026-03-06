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
    resolution: 'raw' | 'hourly' | 'daily' = 'hourly',
  ) {
    if (resolution === 'raw') {
      const rows = await this.readingRepo.find({
        where: { meterId },
        order: { timestamp: 'DESC' },
        take: 2000,
      });
      return rows.reverse();
    }

    const trunc = resolution === 'daily' ? 'day' : 'hour';

    const rows = await this.readingRepo
      .createQueryBuilder('r')
      .select(`date_trunc('${trunc}', r.timestamp)`, 'timestamp')
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
      .where('r.meter_id = :meterId', { meterId })
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

  async findBuildingConsumption(buildingId: string, resolution: 'hourly' | 'daily' = 'hourly') {
    const trunc = resolution === 'daily' ? 'day' : 'hour';

    const rows = await this.readingRepo
      .createQueryBuilder('r')
      .select(`date_trunc('${trunc}', r.timestamp)`, 'timestamp')
      .addSelect('SUM(r.power_kw)', 'totalPowerKw')
      .addSelect('AVG(r.power_kw)', 'avgPowerKw')
      .addSelect('MAX(r.power_kw)', 'peakPowerKw')
      .addSelect('COUNT(*)', 'readings')
      .innerJoin('r.meter', 'm')
      .where('m.building_id = :buildingId', { buildingId })
      .groupBy('1')
      .orderBy('1', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      timestamp: r.timestamp,
      totalPowerKw: Number(Number(r.totalPowerKw).toFixed(3)),
      avgPowerKw: Number(Number(r.avgPowerKw).toFixed(3)),
      peakPowerKw: Number(Number(r.peakPowerKw).toFixed(3)),
    }));
  }
}
