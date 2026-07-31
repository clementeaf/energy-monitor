import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface BaselineQueryDto {
  from: string;
  to: string;
  buildingId?: string;
}

export interface HourlyBaselineRow {
  hour: string;
  actualKwh: number;
  baselineKwh: number;
  deviationPct: number | null;
}

export interface DailyBaselineRow {
  day: string;
  actualKwh: number;
  baselineKwh: number;
  deviationPct: number | null;
}

export interface BaselineSummary {
  totalActualKwh: number;
  totalBaselineKwh: number;
  deviationPct: number | null;
  daysCount: number;
}

@Injectable()
export class BaselineService {
  constructor(private readonly dataSource: DataSource) {}

  static deviationPct(actual: number, expected: number): number | null {
    if (expected === 0) return null;
    return ((actual - expected) / expected) * 100;
  }

  /**
   * Hourly actual vs baseline (4-week same-hour same-day-of-week average).
   * Baseline = AVG of same hour + same DOW over previous 4 weeks.
   */
  async getHourlyBaseline(
    tenantId: string,
    buildingIds: string[],
    query: BaselineQueryDto,
  ): Promise<HourlyBaselineRow[]> {
    const params: unknown[] = [tenantId, buildingIds, query.from, query.to];
    let buildingFilter = '';
    if (query.buildingId) {
      buildingFilter = 'AND m.building_id = $5';
      params.push(query.buildingId);
    }

    const rows = await this.dataSource.query(
      `WITH actual AS (
         SELECT date_trunc('hour', r.timestamp) AS hour,
                SUM(r.power_kw::numeric) / NULLIF(COUNT(*), 0) AS actual_kwh
         FROM readings r
         JOIN meters m ON m.id = r.meter_id
         WHERE r.tenant_id = $1
           AND m.building_id = ANY($2)
           AND r.timestamp >= $3
           AND r.timestamp < $4
           ${buildingFilter}
         GROUP BY date_trunc('hour', r.timestamp)
       ),
       baseline AS (
         SELECT date_trunc('hour', r.timestamp) AS hour,
                EXTRACT(DOW FROM r.timestamp) AS dow,
                EXTRACT(HOUR FROM r.timestamp) AS hod,
                AVG(r.power_kw::numeric) AS baseline_kwh
         FROM readings r
         JOIN meters m ON m.id = r.meter_id
         WHERE r.tenant_id = $1
           AND m.building_id = ANY($2)
           AND r.timestamp >= ($3::date - INTERVAL '28 days')
           AND r.timestamp < $3
           ${buildingFilter}
         GROUP BY EXTRACT(DOW FROM r.timestamp), EXTRACT(HOUR FROM r.timestamp),
                  date_trunc('hour', r.timestamp)
       ),
       baseline_avg AS (
         SELECT dow, hod, AVG(baseline_kwh) AS baseline_kwh
         FROM baseline
         GROUP BY dow, hod
       )
       SELECT to_char(a.hour, 'YYYY-MM-DD HH24:MI') AS hour,
              a.actual_kwh::text AS actual_kwh,
              COALESCE(b.baseline_kwh, 0)::text AS baseline_kwh
       FROM actual a
       LEFT JOIN baseline_avg b
         ON b.dow = EXTRACT(DOW FROM a.hour)
         AND b.hod = EXTRACT(HOUR FROM a.hour)
       ORDER BY a.hour`,
      params,
    );

    return rows.map((r: any) => {
      const actual = parseFloat(r.actual_kwh);
      const baseline = parseFloat(r.baseline_kwh);
      return {
        hour: r.hour,
        actualKwh: actual,
        baselineKwh: baseline,
        deviationPct: BaselineService.deviationPct(actual, baseline),
      };
    });
  }

  async getDailyBaseline(
    tenantId: string,
    buildingIds: string[],
    query: BaselineQueryDto,
  ): Promise<DailyBaselineRow[]> {
    const params: unknown[] = [tenantId, buildingIds, query.from, query.to];
    let buildingFilter = '';
    if (query.buildingId) {
      buildingFilter = 'AND m.building_id = $5';
      params.push(query.buildingId);
    }

    const rows = await this.dataSource.query(
      `WITH actual AS (
         SELECT date_trunc('day', r.timestamp)::date AS day,
                SUM(r.power_kw::numeric) AS actual_kwh
         FROM readings r
         JOIN meters m ON m.id = r.meter_id
         WHERE r.tenant_id = $1
           AND m.building_id = ANY($2)
           AND r.timestamp >= $3
           AND r.timestamp < $4
           ${buildingFilter}
         GROUP BY date_trunc('day', r.timestamp)::date
       ),
       baseline AS (
         SELECT EXTRACT(DOW FROM r.timestamp) AS dow,
                AVG(r.power_kw::numeric) * COUNT(DISTINCT date_trunc('hour', r.timestamp))
                  / NULLIF(COUNT(DISTINCT date_trunc('day', r.timestamp)::date), 0) AS baseline_kwh
         FROM readings r
         JOIN meters m ON m.id = r.meter_id
         WHERE r.tenant_id = $1
           AND m.building_id = ANY($2)
           AND r.timestamp >= ($3::date - INTERVAL '28 days')
           AND r.timestamp < $3
           ${buildingFilter}
         GROUP BY EXTRACT(DOW FROM r.timestamp)
       )
       SELECT to_char(a.day, 'YYYY-MM-DD') AS day,
              a.actual_kwh::text AS actual_kwh,
              COALESCE(b.baseline_kwh, 0)::text AS baseline_kwh
       FROM actual a
       LEFT JOIN baseline b ON b.dow = EXTRACT(DOW FROM a.day)
       ORDER BY a.day`,
      params,
    );

    return rows.map((r: any) => {
      const actual = parseFloat(r.actual_kwh);
      const baseline = parseFloat(r.baseline_kwh);
      return {
        day: r.day,
        actualKwh: actual,
        baselineKwh: baseline,
        deviationPct: BaselineService.deviationPct(actual, baseline),
      };
    });
  }

  async getBaselineSummary(
    tenantId: string,
    buildingIds: string[],
    query: BaselineQueryDto,
  ): Promise<BaselineSummary> {
    const params: unknown[] = [tenantId, buildingIds, query.from, query.to];
    let buildingFilter = '';
    if (query.buildingId) {
      buildingFilter = 'AND m.building_id = $5';
      params.push(query.buildingId);
    }

    const rows = await this.dataSource.query(
      `WITH actual AS (
         SELECT date_trunc('day', r.timestamp)::date AS day,
                SUM(r.power_kw::numeric) AS daily_kwh
         FROM readings r
         JOIN meters m ON m.id = r.meter_id
         WHERE r.tenant_id = $1
           AND m.building_id = ANY($2)
           AND r.timestamp >= $3
           AND r.timestamp < $4
           ${buildingFilter}
         GROUP BY date_trunc('day', r.timestamp)::date
       ),
       baseline AS (
         SELECT EXTRACT(DOW FROM r.timestamp) AS dow,
                AVG(r.power_kw::numeric) * COUNT(DISTINCT date_trunc('hour', r.timestamp))
                  / NULLIF(COUNT(DISTINCT date_trunc('day', r.timestamp)::date), 0) AS baseline_kwh
         FROM readings r
         JOIN meters m ON m.id = r.meter_id
         WHERE r.tenant_id = $1
           AND m.building_id = ANY($2)
           AND r.timestamp >= ($3::date - INTERVAL '28 days')
           AND r.timestamp < $3
           ${buildingFilter}
         GROUP BY EXTRACT(DOW FROM r.timestamp)
       )
       SELECT COALESCE(SUM(a.daily_kwh), 0)::text AS total_actual_kwh,
              COALESCE(SUM(b.baseline_kwh), 0)::text AS total_baseline_kwh,
              COUNT(a.day)::text AS days_count
       FROM actual a
       LEFT JOIN baseline b ON b.dow = EXTRACT(DOW FROM a.day)`,
      params,
    );

    const row = rows[0] ?? { total_actual_kwh: '0', total_baseline_kwh: '0', days_count: '0' };
    const totalActual = parseFloat(row.total_actual_kwh);
    const totalBaseline = parseFloat(row.total_baseline_kwh);

    return {
      totalActualKwh: totalActual,
      totalBaselineKwh: totalBaseline,
      deviationPct: BaselineService.deviationPct(totalActual, totalBaseline),
      daysCount: parseInt(row.days_count, 10),
    };
  }
}
