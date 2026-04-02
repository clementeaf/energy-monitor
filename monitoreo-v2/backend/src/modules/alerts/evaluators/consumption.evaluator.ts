import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertEvaluator, EvaluationResult } from './evaluator.interface';
import { AlertRule } from '../../platform/entities/alert-rule.entity';
import {
  ABNORMAL_CONSUMPTION,
  PEAK_DEMAND_EXCEEDED,
  ENERGY_DEVIATION,
} from '../alert-type-codes';

@Injectable()
export class ConsumptionEvaluator implements AlertEvaluator {
  readonly supportedCodes = [ABNORMAL_CONSUMPTION, PEAK_DEMAND_EXCEEDED, ENERGY_DEVIATION];

  constructor(private readonly ds: DataSource) {}

  async evaluate(rule: AlertRule, tenantId: string): Promise<EvaluationResult[]> {
    switch (rule.alertTypeCode) {
      case PEAK_DEMAND_EXCEEDED:
        return this.evaluatePeakDemand(rule, tenantId);
      case ABNORMAL_CONSUMPTION:
        return this.evaluateAbnormalConsumption(rule, tenantId);
      case ENERGY_DEVIATION:
        return this.evaluateEnergyDeviation(rule, tenantId);
      default:
        return [];
    }
  }

  /**
   * PEAK_DEMAND_EXCEEDED: current power > contracted demand * (1 + tolerancePct/100)
   * config.tolerancePct (default 0, i.e. exact limit)
   */
  private async evaluatePeakDemand(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const tolerancePct = (rule.config as Record<string, number>).tolerancePct ?? 0;
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      meter_id: string;
      meter_name: string;
      building_id: string;
      power_kw: string;
      contracted_demand_kw: string;
    }> = await this.ds.query(
      `SELECT DISTINCT ON (r.meter_id)
         r.meter_id, m.name AS meter_name, m.building_id,
         r.power_kw, m.contracted_demand_kw
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE m.tenant_id = $1
         AND m.is_active = true
         AND m.contracted_demand_kw IS NOT NULL
         AND r.timestamp >= NOW() - INTERVAL '30 minutes'
         ${buildingFilter}
       ORDER BY r.meter_id, r.timestamp DESC`,
      params,
    );

    const results: EvaluationResult[] = [];
    for (const row of rows) {
      const power = parseFloat(row.power_kw);
      const contracted = parseFloat(row.contracted_demand_kw);
      const limit = contracted * (1 + tolerancePct / 100);
      if (power > limit) {
        results.push({
          targetId: row.meter_id,
          buildingId: row.building_id,
          triggeredValue: power,
          thresholdValue: limit,
          message: `${row.meter_name}: demanda ${power.toFixed(1)} kW > contratada ${contracted.toFixed(1)} kW`,
        });
      }
    }
    return results;
  }

  /**
   * ABNORMAL_CONSUMPTION: current hour avg power deviates > N% from same-hour 7-day avg.
   * config.deviationPct (default 50)
   */
  private async evaluateAbnormalConsumption(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const deviationPct = (rule.config as Record<string, number>).deviationPct ?? 50;
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      meter_id: string;
      meter_name: string;
      building_id: string;
      current_avg: number;
      historical_avg: number;
    }> = await this.ds.query(
      `WITH current_hour AS (
         SELECT r.meter_id,
                AVG(r.power_kw::numeric) AS current_avg
         FROM readings r
         INNER JOIN meters m ON m.id = r.meter_id
         WHERE m.tenant_id = $1
           AND m.is_active = true
           AND r.timestamp >= date_trunc('hour', NOW())
           ${buildingFilter}
         GROUP BY r.meter_id
       ),
       historical AS (
         SELECT r.meter_id,
                AVG(r.power_kw::numeric) AS historical_avg
         FROM readings r
         INNER JOIN meters m ON m.id = r.meter_id
         WHERE m.tenant_id = $1
           AND m.is_active = true
           AND r.timestamp >= NOW() - INTERVAL '7 days'
           AND r.timestamp < date_trunc('hour', NOW())
           AND EXTRACT(HOUR FROM r.timestamp) = EXTRACT(HOUR FROM NOW())
           ${buildingFilter}
         GROUP BY r.meter_id
       )
       SELECT c.meter_id, m.name AS meter_name, m.building_id,
              c.current_avg::float, h.historical_avg::float
       FROM current_hour c
       INNER JOIN historical h ON h.meter_id = c.meter_id AND h.historical_avg > 0
       INNER JOIN meters m ON m.id = c.meter_id
       WHERE ABS(c.current_avg - h.historical_avg) / h.historical_avg * 100 > ${deviationPct}`,
      params,
    );

    return rows.map((r) => {
      const devPct = Math.round(
        Math.abs(r.current_avg - r.historical_avg) / r.historical_avg * 100,
      );
      return {
        targetId: r.meter_id,
        buildingId: r.building_id,
        triggeredValue: r.current_avg,
        thresholdValue: r.historical_avg,
        message: `${r.meter_name}: consumo actual desvía ${devPct}% del promedio histórico (umbral: ${deviationPct}%)`,
      };
    });
  }

  /**
   * ENERGY_DEVIATION: daily energy differs > N% from 7-day daily avg.
   * config.deviationPct (default 30)
   */
  private async evaluateEnergyDeviation(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const deviationPct = (rule.config as Record<string, number>).deviationPct ?? 30;
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      meter_id: string;
      meter_name: string;
      building_id: string;
      today_kwh: number;
      avg_daily_kwh: number;
    }> = await this.ds.query(
      `WITH today_energy AS (
         SELECT r.meter_id,
                (MAX(r.energy_kwh_total::numeric) - MIN(r.energy_kwh_total::numeric)) AS today_kwh
         FROM readings r
         INNER JOIN meters m ON m.id = r.meter_id
         WHERE m.tenant_id = $1
           AND m.is_active = true
           AND r.timestamp >= date_trunc('day', NOW())
           ${buildingFilter}
         GROUP BY r.meter_id
       ),
       weekly_avg AS (
         SELECT r.meter_id,
                (MAX(r.energy_kwh_total::numeric) - MIN(r.energy_kwh_total::numeric)) / 7 AS avg_daily_kwh
         FROM readings r
         INNER JOIN meters m ON m.id = r.meter_id
         WHERE m.tenant_id = $1
           AND m.is_active = true
           AND r.timestamp >= NOW() - INTERVAL '7 days'
           AND r.timestamp < date_trunc('day', NOW())
           ${buildingFilter}
         GROUP BY r.meter_id
       )
       SELECT t.meter_id, m.name AS meter_name, m.building_id,
              t.today_kwh::float, w.avg_daily_kwh::float
       FROM today_energy t
       INNER JOIN weekly_avg w ON w.meter_id = t.meter_id AND w.avg_daily_kwh > 0
       INNER JOIN meters m ON m.id = t.meter_id
       WHERE ABS(t.today_kwh - w.avg_daily_kwh) / w.avg_daily_kwh * 100 > ${deviationPct}`,
      params,
    );

    return rows.map((r) => {
      const devPct = Math.round(
        Math.abs(r.today_kwh - r.avg_daily_kwh) / r.avg_daily_kwh * 100,
      );
      return {
        targetId: r.meter_id,
        buildingId: r.building_id,
        triggeredValue: r.today_kwh,
        thresholdValue: r.avg_daily_kwh,
        message: `${r.meter_name}: energía diaria desvía ${devPct}% del promedio semanal (umbral: ${deviationPct}%)`,
      };
    });
  }
}
