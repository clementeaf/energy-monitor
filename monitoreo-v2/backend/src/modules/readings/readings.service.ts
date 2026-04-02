import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReadingQueryDto } from './dto/reading-query.dto';
import { LatestQueryDto } from './dto/latest-query.dto';
import { AggregatedQueryDto } from './dto/aggregated-query.dto';

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
}

export interface LatestRow {
  meter_id: string;
  meter_name: string;
  building_id: string;
  timestamp: string;
  power_kw: string;
  energy_kwh_total: string;
  voltage_l1: string | null;
  current_l1: string | null;
  power_factor: string | null;
  frequency_hz: string | null;
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

const RESOLUTION_MAP: Record<string, string> = {
  '5min': '5 minutes',
  '15min': '15 minutes',
  '1h': '1 hour',
  '1d': '1 day',
};

const INTERVAL_MAP: Record<string, string> = {
  hourly: '1 hour',
  daily: '1 day',
  monthly: '1 month',
};

@Injectable()
export class ReadingsService {
  constructor(private readonly dataSource: DataSource) {}

  async findByMeter(
    tenantId: string,
    buildingIds: string[],
    query: ReadingQueryDto,
  ): Promise<ReadingRow[]> {
    const resolution = query.resolution ?? 'raw';
    const limit = query.limit ?? 1000;

    // Verify meter belongs to tenant + buildingIds scope
    const meterCheck = await this.buildMeterScopeCheck(
      tenantId,
      buildingIds,
      query.meterId,
    );
    if (!meterCheck) return [];

    if (resolution === 'raw') {
      return this.dataSource.query(
        `SELECT id, meter_id, timestamp,
                voltage_l1, voltage_l2, voltage_l3,
                current_l1, current_l2, current_l3,
                power_kw, reactive_power_kvar, power_factor,
                frequency_hz, energy_kwh_total,
                thd_voltage_pct, thd_current_pct, phase_imbalance_pct
         FROM readings
         WHERE meter_id = $1
           AND timestamp >= $2
           AND timestamp <= $3
         ORDER BY timestamp ASC
         LIMIT $4`,
        [query.meterId, query.from, query.to, limit],
      );
    }

    const pgInterval = RESOLUTION_MAP[resolution];
    if (!pgInterval) return [];

    return this.dataSource.query(
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
         AVG(phase_imbalance_pct::numeric)::text AS phase_imbalance_pct
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

  async findLatest(
    tenantId: string,
    buildingIds: string[],
    query: LatestQueryDto,
  ): Promise<LatestRow[]> {
    const params: unknown[] = [tenantId];
    const conditions: string[] = ['m.tenant_id = $1'];
    let paramIdx = 2;

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
      `SELECT DISTINCT ON (r.meter_id)
         r.meter_id,
         m.name AS meter_name,
         m.building_id,
         r.timestamp,
         r.power_kw,
         r.energy_kwh_total,
         r.voltage_l1,
         r.current_l1,
         r.power_factor,
         r.frequency_hz
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE ${where}
       ORDER BY r.meter_id, r.timestamp DESC`,
      params,
    );
  }

  async findAggregated(
    tenantId: string,
    buildingIds: string[],
    query: AggregatedQueryDto,
  ): Promise<AggregatedRow[]> {
    const pgInterval = INTERVAL_MAP[query.interval];
    if (!pgInterval) return [];

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
