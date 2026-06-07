import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { mapIotQualityToReadingQuality } from '../../common/constants/reading-quality';
import { NormalizationService } from '../../lib/normalization.service';
import { normalizeIotVariableRow } from '../../lib/iot-variable-mappings';

const ALLOWED_VARIABLES = new Set([
  'voltage_l1', 'voltage_l2', 'voltage_l3',
  'current_l1', 'current_l2', 'current_l3',
  'active_power_w', 'reactive_power_var', 'apparent_power_va',
  'power_factor', 'frequency_hz',
  'energy_import_wh', 'energy_export_wh',
  'thd_voltage_l1_pct', 'thd_voltage_l2_pct', 'thd_voltage_l3_pct',
  'thd_current_l1_pct', 'thd_current_l2_pct', 'thd_current_l3_pct',
  'peak_demand_w',
]);

const CUMULATIVE_VARIABLES = new Set(['energy_import_wh', 'energy_export_wh']);

const RESOLUTION_MAP: Record<string, string> = {
  hour: '1 hour',
  day: '1 day',
};

/**
 * IoT readings service for EAV-format hypertable.
 * All queries scoped by tenant_id + buildingIds RBAC.
 *
 * Quality mapping (iot_readings.quality → readings.quality when unified):
 * use mapIotQualityToReadingQuality() from common/constants/reading-quality.ts
 * @see mapIotQualityToReadingQuality
 */
@Injectable()
export class IotReadingsService {
  /** Exposed for ingest promotion docs/tests — maps numeric IoT quality to enum. */
  readonly mapQuality = mapIotQualityToReadingQuality;

  constructor(
    private readonly dataSource: DataSource,
    private readonly normalizationService: NormalizationService,
  ) {}

  /**
   * Latest reading per variable for a meter (or all meters in scope).
   */
  async getLatest(
    tenantId: string,
    buildingIds: string[],
    meterId?: string,
  ) {
    const params: unknown[] = [tenantId];
    const conditions = ['r.tenant_id = $1'];
    let idx = 2;

    if (buildingIds.length > 0) {
      const ph = buildingIds.map((_, i) => `$${idx + i}`);
      conditions.push(`m.building_id IN (${ph.join(',')})`);
      params.push(...buildingIds);
      idx += buildingIds.length;
    }

    if (meterId) {
      conditions.push(`r.meter_id = $${idx}`);
      params.push(meterId);
      idx++;
    }

    const where = conditions.join(' AND ');

    return this.dataSource.query(
      `SELECT DISTINCT ON (r.meter_id, r.variable_name)
         r.meter_id, m.name AS meter_name, r.variable_name, r.value, r.time
       FROM iot_readings r
       JOIN meters m ON m.id = r.meter_id
       WHERE ${where}
       ORDER BY r.meter_id, r.variable_name, r.time DESC`,
      params,
    );
  }

  /**
   * Time series for specific variables on a meter.
   * Supports raw, hourly, and daily resolution via time_bucket.
   */
  async getTimeSeries(
    tenantId: string,
    buildingIds: string[],
    meterId: string,
    from: string,
    to: string,
    variables: string[],
    resolution: string = 'raw',
  ) {
    const safeVars = variables.filter((v) => ALLOWED_VARIABLES.has(v));
    if (safeVars.length === 0) return [];

    if (!this.checkMeterScope(tenantId, buildingIds, meterId)) return [];

    const params: unknown[] = [tenantId, meterId, from, to, safeVars];

    if (resolution === 'raw') {
      return this.dataSource.query(
        `SELECT time, variable_name, value
         FROM iot_readings
         WHERE tenant_id = $1 AND meter_id = $2
           AND time >= $3 AND time <= $4
           AND variable_name = ANY($5)
         ORDER BY time ASC`,
        params,
      );
    }

    const bucket = RESOLUTION_MAP[resolution];
    if (!bucket) return [];

    return this.dataSource.query(
      `SELECT time_bucket($6::interval, time) AS time,
              variable_name,
              CASE WHEN variable_name = ANY($7) THEN MAX(value) ELSE AVG(value) END AS value
       FROM iot_readings
       WHERE tenant_id = $1 AND meter_id = $2
         AND time >= $3 AND time <= $4
         AND variable_name = ANY($5)
       GROUP BY time_bucket($6::interval, time), variable_name
       ORDER BY time ASC, variable_name`,
      [...params, bucket, Array.from(CUMULATIVE_VARIABLES)],
    );
  }

  /**
   * Paginated readings pivoted to columnar format (PASA-compatible).
   */
  async getReadings(
    tenantId: string,
    buildingIds: string[],
    meterId: string,
    from: string,
    to: string,
    limit = 100,
  ) {
    if (!this.checkMeterScope(tenantId, buildingIds, meterId)) {
      return { rows: [], total: 0 };
    }

    const [rows, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT time,
           MAX(value) FILTER (WHERE variable_name = 'voltage_l1') AS voltage_l1,
           MAX(value) FILTER (WHERE variable_name = 'voltage_l2') AS voltage_l2,
           MAX(value) FILTER (WHERE variable_name = 'voltage_l3') AS voltage_l3,
           MAX(value) FILTER (WHERE variable_name = 'current_l1') AS current_l1,
           MAX(value) FILTER (WHERE variable_name = 'current_l2') AS current_l2,
           MAX(value) FILTER (WHERE variable_name = 'current_l3') AS current_l3,
           MAX(value) FILTER (WHERE variable_name = 'active_power_w') AS active_power_w,
           MAX(value) FILTER (WHERE variable_name = 'reactive_power_var') AS reactive_power_var,
           MAX(value) FILTER (WHERE variable_name = 'power_factor') AS power_factor,
           MAX(value) FILTER (WHERE variable_name = 'frequency_hz') AS frequency_hz,
           MAX(value) FILTER (WHERE variable_name = 'energy_import_wh') AS energy_import_wh,
           MAX(value) FILTER (WHERE variable_name = 'peak_demand_w') AS peak_demand_w
         FROM iot_readings
         WHERE tenant_id = $1 AND meter_id = $2 AND time >= $3 AND time <= $4
         GROUP BY time
         ORDER BY time DESC
         LIMIT $5`,
        [tenantId, meterId, from, to, Math.min(limit, 5000)],
      ),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT time)::int AS total
         FROM iot_readings
         WHERE tenant_id = $1 AND meter_id = $2 AND time >= $3 AND time <= $4`,
        [tenantId, meterId, from, to],
      ),
    ]);

    const normalizedRows = (rows as Record<string, unknown>[]).map((row) =>
      this.normalizePivotedRow(row),
    );

    return { rows: normalizedRows, total: countResult[0]?.total ?? 0 };
  }

  /**
   * Applies IoT variable mappings to a pivoted SQL row.
   */
  private normalizePivotedRow(row: Record<string, unknown>): Record<string, unknown> {
    const { time, ...variables } = row;
    const normalized = normalizeIotVariableRow(
      this.normalizationService.apply.bind(this.normalizationService),
      variables,
    );
    return { time, ...normalized };
  }

  /**
   * Alerts generated on-the-fly from anomalous IoT readings.
   */
  async getAlerts(
    tenantId: string,
    buildingIds: string[],
    filters?: { severity?: string; meterId?: string },
  ) {
    const params: unknown[] = [tenantId];
    const conditions = ['r.tenant_id = $1'];
    let idx = 2;

    if (buildingIds.length > 0) {
      const ph = buildingIds.map((_, i) => `$${idx + i}`);
      conditions.push(`m.building_id IN (${ph.join(',')})`);
      params.push(...buildingIds);
      idx += buildingIds.length;
    }

    if (filters?.meterId) {
      conditions.push(`r.meter_id = $${idx}`);
      params.push(filters.meterId);
      idx++;
    }

    const where = conditions.join(' AND ');

    // Pivot per timestamp, then detect anomalies
    const rows = await this.dataSource.query(
      `WITH pivoted AS (
         SELECT
           r.meter_id, m.name AS meter_name, r.time,
           MAX(value) FILTER (WHERE variable_name = 'voltage_l1') AS voltage_l1,
           MAX(value) FILTER (WHERE variable_name = 'power_factor') AS power_factor,
           MAX(value) FILTER (WHERE variable_name = 'active_power_w') AS active_power_w,
           MAX(value) FILTER (WHERE variable_name = 'thd_voltage_l1_pct') AS thd_voltage_l1,
           MAX(value) FILTER (WHERE variable_name = 'thd_current_l1_pct') AS thd_current_l1
         FROM iot_readings r
         JOIN meters m ON m.id = r.meter_id
         WHERE ${where}
         GROUP BY r.meter_id, m.name, r.time
       ),
       anomalies AS (
         SELECT *, CASE
           WHEN voltage_l1 < 200 THEN 'LOW_VOLTAGE'
           WHEN voltage_l1 > 250 THEN 'HIGH_VOLTAGE'
           WHEN power_factor IS NOT NULL AND power_factor < 0.85 THEN 'LOW_POWER_FACTOR'
           WHEN thd_voltage_l1 > 8 THEN 'HIGH_THD_VOLTAGE'
           WHEN thd_current_l1 > 20 THEN 'HIGH_THD_CURRENT'
         END AS alert_type,
         CASE
           WHEN voltage_l1 < 200 OR voltage_l1 > 250 THEN 'HIGH'
           ELSE 'MEDIUM'
         END AS severity
         FROM pivoted
         WHERE voltage_l1 < 200 OR voltage_l1 > 250
            OR (power_factor IS NOT NULL AND power_factor < 0.85)
            OR thd_voltage_l1 > 8
            OR thd_current_l1 > 20
       )
       SELECT * FROM anomalies
       ${filters?.severity ? `WHERE severity = $${idx}` : ''}
       ORDER BY time DESC LIMIT 500`,
      filters?.severity ? [...params, filters.severity] : params,
    );

    return rows;
  }

  /**
   * Summary stats for a meter in a time range.
   */
  async getStats(
    tenantId: string,
    buildingIds: string[],
    meterId: string,
    from: string,
    to: string,
  ) {
    if (!this.checkMeterScope(tenantId, buildingIds, meterId)) return null;

    const rows = await this.dataSource.query(
      `SELECT
         COUNT(DISTINCT time)::int AS reading_count,
         MIN(time) AS first_reading,
         MAX(time) AS last_reading,
         AVG(value) FILTER (WHERE variable_name = 'voltage_l1') AS avg_voltage,
         AVG(value) FILTER (WHERE variable_name = 'active_power_w') AS avg_power_w,
         MAX(value) FILTER (WHERE variable_name = 'active_power_w') AS max_power_w,
         AVG(value) FILTER (WHERE variable_name = 'power_factor') AS avg_power_factor,
         AVG(value) FILTER (WHERE variable_name = 'frequency_hz') AS avg_frequency_hz,
         MAX(value) FILTER (WHERE variable_name = 'energy_import_wh') AS max_energy_import_wh,
         MAX(value) FILTER (WHERE variable_name = 'peak_demand_w') AS max_peak_demand_w
       FROM iot_readings
       WHERE tenant_id = $1 AND meter_id = $2 AND time >= $3 AND time <= $4`,
      [tenantId, meterId, from, to],
    );

    const stats = rows[0] ?? null;
    if (!stats) return null;

    const normalized = normalizeIotVariableRow(
      this.normalizationService.apply.bind(this.normalizationService),
      {
        active_power_w: stats.avg_power_w,
        energy_import_wh: stats.max_energy_import_wh,
        peak_demand_w: stats.max_peak_demand_w,
      },
    );

    return {
      ...stats,
      avg_power_kw: normalized.power_kw ?? null,
      max_power_kw:
        stats.max_power_w != null
          ? normalizeIotVariableRow(
              this.normalizationService.apply.bind(this.normalizationService),
              { active_power_w: stats.max_power_w },
            ).power_kw ?? null
          : null,
      max_energy_kwh_total: normalized.energy_kwh_total ?? null,
      max_peak_demand_kw: normalized.peak_demand_kw ?? null,
    };
  }

  private async checkMeterScope(tenantId: string, buildingIds: string[], meterId: string): Promise<boolean> {
    const params: unknown[] = [meterId, tenantId];
    const conditions = ['id = $1', 'tenant_id = $2'];

    if (buildingIds.length > 0) {
      const ph = buildingIds.map((_, i) => `$${3 + i}`);
      conditions.push(`building_id IN (${ph.join(',')})`);
      params.push(...buildingIds);
    }

    const result = await this.dataSource.query(
      `SELECT 1 FROM meters WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params,
    );
    return result.length > 0;
  }
}
