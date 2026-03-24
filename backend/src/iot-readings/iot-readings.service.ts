import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type Resolution = 'raw' | 'hour' | 'day';

const rawVal = (col: string) => `"${col}"`;

const ALLOWED_COLUMNS = new Set([
  'voltage_l1', 'voltage_l2', 'voltage_l3', 'voltage_avg',
  'current_l1', 'current_l2', 'current_l3', 'current_avg',
  'active_power_w', 'reactive_power_var', 'apparent_power_va',
  'power_factor', 'frequency_hz',
  'energy_import_wh', 'energy_export_wh',
  'thd_voltage_l1_pct', 'thd_voltage_l2_pct', 'thd_voltage_l3_pct',
  'thd_current_l1_pct', 'thd_current_l2_pct', 'thd_current_l3_pct',
  'peak_demand_w',
]);

// Cumulative columns use MAX instead of AVG
const CUMULATIVE_COLUMNS = new Set(['energy_import_wh', 'energy_export_wh']);

@Injectable()
export class IotReadingsService {
  constructor(private readonly dataSource: DataSource) {}

  async getLatest(deviceId: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM iot_readings
       WHERE device_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [deviceId],
    );
    return rows[0] || null;
  }

  async getTimeSeries(
    deviceId: string,
    from: string,
    to: string,
    columns: string[],
    resolution: Resolution = 'raw',
  ) {
    const safeCols = columns.filter((c) => ALLOWED_COLUMNS.has(c));
    if (!safeCols.length) return [];

    if (resolution === 'raw') {
      const select = safeCols.map((c) => `${rawVal(c)} as ${rawVal(c)}`).join(', ');
      return this.dataSource.query(
        `SELECT timestamp, ${select}
         FROM iot_readings
         WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3
         ORDER BY timestamp ASC`,
        [deviceId, from, to],
      );
    }

    const bucket = resolution === 'hour' ? 'hour' : 'day';
    const aggs = safeCols.map((c) => {
      const fn = CUMULATIVE_COLUMNS.has(c) ? 'MAX' : 'AVG';
      return `${fn}(${rawVal(c)}) as ${rawVal(c)}`;
    }).join(', ');

    return this.dataSource.query(
      `SELECT date_trunc('${bucket}', timestamp) as timestamp, ${aggs}
       FROM iot_readings
       WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3
       GROUP BY date_trunc('${bucket}', timestamp)
       ORDER BY 1 ASC`,
      [deviceId, from, to],
    );
  }

  async getReadings(
    deviceId: string,
    from: string,
    to: string,
    limit = 100,
    offset = 0,
  ) {
    const [rows, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT id, device_id, device_name, timestamp,
                voltage_l1, voltage_l2, voltage_l3, voltage_avg,
                current_l1, current_l2, current_l3, current_avg,
                active_power_w, reactive_power_var, apparent_power_va,
                power_factor, frequency_hz,
                energy_import_wh, energy_export_wh,
                thd_voltage_l1_pct, thd_voltage_l2_pct, thd_voltage_l3_pct,
                thd_current_l1_pct, thd_current_l2_pct, thd_current_l3_pct,
                peak_demand_w, created_at
         FROM iot_readings
         WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3
         ORDER BY timestamp DESC
         LIMIT $4 OFFSET $5`,
        [deviceId, from, to, Math.min(limit, 500), offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int as total
         FROM iot_readings
         WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3`,
        [deviceId, from, to],
      ),
    ]);

    return { rows, total: countResult[0]?.total ?? 0 };
  }

  // ── PASA-compatible endpoints ──────────────────────────
  // Return data in same shape as PASA endpoints so frontend pages work unchanged

  /** BuildingSummary-compatible: one "building" per device */
  async getBuildingsSummary() {
    const rows = await this.dataSource.query(`
      SELECT
        device_id,
        device_name as building_name,
        SUM(active_power_w) / 1000 as total_kwh,
        AVG(active_power_w) / 1000 as avg_power_kw,
        MAX(active_power_w) / 1000 as peak_demand_kw,
        AVG(power_factor) as avg_power_factor,
        0 as area_sqm,
        1 as total_meters
      FROM iot_readings
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY device_id, device_name
    `);
    return rows.map((r: Record<string, unknown>) => ({
      buildingName: r.building_name,
      deviceId: r.device_id,
      totalKwh: r.total_kwh ? parseFloat(String(r.total_kwh)) : null,
      avgPowerKw: r.avg_power_kw ? parseFloat(String(r.avg_power_kw)) : null,
      peakDemandKw: r.peak_demand_kw ? parseFloat(String(r.peak_demand_kw)) : null,
      avgPowerFactor: r.avg_power_factor ? parseFloat(String(r.avg_power_factor)) : null,
      areaSqm: 0,
      totalMeters: 1,
    }));
  }

  /** MeterLatestReading-compatible: latest per device */
  async getMetersLatest() {
    const rows = await this.dataSource.query(`
      SELECT DISTINCT ON (device_id)
        device_id, device_name, timestamp,
        voltage_l1, current_l1, active_power_w, power_factor
      FROM iot_readings
      ORDER BY device_id, timestamp DESC
    `);
    return rows.map((r: Record<string, unknown>) => ({
      meterId: r.device_id,
      storeName: r.device_name,
      buildingName: r.device_name,
      powerKw: r.active_power_w ? parseFloat(String(r.active_power_w)) / 1000 : null,
      voltageL1: r.voltage_l1 ? parseFloat(String(r.voltage_l1)) : null,
      currentL1: r.current_l1 ? parseFloat(String(r.current_l1)) : null,
      powerFactor: r.power_factor ? parseFloat(String(r.power_factor)) : null,
      timestamp: r.timestamp,
    }));
  }

  /** MeterMonthly-compatible: monthly aggregates per device */
  async getMonthly(deviceId: string) {
    const rows = await this.dataSource.query(`
      SELECT
        DATE_TRUNC('month', timestamp)::date as month,
        SUM(energy_import_wh) / 1000 as total_kwh,
        AVG(active_power_w) / 1000 as avg_power_kw,
        MAX(active_power_w) / 1000 as peak_power_kw,
        AVG(reactive_power_var) / 1000 as total_reactive_kvar,
        AVG(power_factor) as avg_power_factor
      FROM iot_readings
      WHERE device_id = $1
      GROUP BY DATE_TRUNC('month', timestamp)
      ORDER BY 1 ASC
    `, [deviceId]);
    return rows.map((r: Record<string, unknown>) => ({
      month: r.month,
      totalKwh: r.total_kwh ? parseFloat(String(r.total_kwh)) : null,
      avgPowerKw: r.avg_power_kw ? parseFloat(String(r.avg_power_kw)) : null,
      peakPowerKw: r.peak_power_kw ? parseFloat(String(r.peak_power_kw)) : null,
      totalReactiveKvar: r.total_reactive_kvar ? parseFloat(String(r.total_reactive_kvar)) : null,
      avgPowerFactor: r.avg_power_factor ? parseFloat(String(r.avg_power_factor)) : null,
    }));
  }

  /** MeterReading-compatible: readings for a device in a time range */
  async getMeterReadings(deviceId: string, from: string, to: string, limit = 5000) {
    const rows = await this.dataSource.query(`
      SELECT timestamp,
        voltage_l1, voltage_l2, voltage_l3,
        current_l1, current_l2, current_l3,
        active_power_w / 1000 as power_kw,
        reactive_power_var / 1000 as reactive_power_kvar,
        power_factor, frequency_hz,
        energy_import_wh / 1000 as energy_kwh_total
      FROM iot_readings
      WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3
      ORDER BY timestamp ASC
      LIMIT $4
    `, [deviceId, from, to, Math.min(limit, 5000)]);
    return rows.map((r: Record<string, unknown>) => ({
      meterId: deviceId,
      timestamp: r.timestamp,
      voltageL1: r.voltage_l1 ? parseFloat(String(r.voltage_l1)) : null,
      voltageL2: r.voltage_l2 ? parseFloat(String(r.voltage_l2)) : null,
      voltageL3: r.voltage_l3 ? parseFloat(String(r.voltage_l3)) : null,
      currentL1: r.current_l1 ? parseFloat(String(r.current_l1)) : null,
      currentL2: r.current_l2 ? parseFloat(String(r.current_l2)) : null,
      currentL3: r.current_l3 ? parseFloat(String(r.current_l3)) : null,
      powerKw: r.power_kw ? parseFloat(String(r.power_kw)) : null,
      reactivePowerKvar: r.reactive_power_kvar ? parseFloat(String(r.reactive_power_kvar)) : null,
      powerFactor: r.power_factor ? parseFloat(String(r.power_factor)) : null,
      frequencyHz: r.frequency_hz ? parseFloat(String(r.frequency_hz)) : null,
      energyKwhTotal: r.energy_kwh_total ? parseFloat(String(r.energy_kwh_total)) : null,
    }));
  }

  async getStats(deviceId: string, from: string, to: string) {
    const rows = await this.dataSource.query(
      `SELECT
         COUNT(*)::int as count,
         MIN(timestamp) as first_reading,
         MAX(timestamp) as last_reading,
         AVG(voltage_avg) as avg_voltage,
         AVG(active_power_w) as avg_power_w,
         MAX(active_power_w) as max_power_w,
         AVG(power_factor) as avg_power_factor,
         AVG(frequency_hz) as avg_frequency_hz,
         MAX(energy_import_wh) as max_energy_import_wh,
         MAX(peak_demand_w) as max_peak_demand_w
       FROM iot_readings
       WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3`,
      [deviceId, from, to],
    );
    return rows[0] || null;
  }
}
