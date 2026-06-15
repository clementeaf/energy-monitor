import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertEvaluator, EvaluationResult } from './evaluator.interface';
import { AlertRule } from '../../platform/entities/alert-rule.entity';
import {
  TREND_BREAK,
  NULL_SPIKE,
  VOLUME_ANOMALY,
} from '../alert-type-codes';

/**
 * DAT-27 — Data observability evaluator.
 * Detects trend breaks, null spikes, and volume anomalies in readings.
 */
@Injectable()
export class DataObservabilityEvaluator implements AlertEvaluator {
  readonly supportedCodes = [TREND_BREAK, NULL_SPIKE, VOLUME_ANOMALY];

  constructor(private readonly ds: DataSource) {}

  async evaluate(rule: AlertRule, tenantId: string): Promise<EvaluationResult[]> {
    const handlers: Record<string, (r: AlertRule, t: string) => Promise<EvaluationResult[]>> = {
      [TREND_BREAK]: (r, t) => this.evaluateTrendBreak(r, t),
      [NULL_SPIKE]: (r, t) => this.evaluateNullSpike(r, t),
      [VOLUME_ANOMALY]: (r, t) => this.evaluateVolumeAnomaly(r, t),
    };
    const handler = handlers[rule.alertTypeCode];
    return handler ? handler(rule, tenantId) : [];
  }

  /**
   * TREND_BREAK: current 24h avg power deviates > N% from preceding 7-day avg.
   * config.deviationPct (default 40)
   */
  private async evaluateTrendBreak(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const deviationPct = (rule.config as Record<string, number>).deviationPct ?? 40;
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      meter_id: string;
      meter_name: string;
      building_id: string;
      recent_avg: number;
      baseline_avg: number;
    }> = await this.ds.query(
      `WITH recent AS (
         SELECT r.meter_id, AVG(r.power_kw::numeric) AS recent_avg
         FROM readings r
         INNER JOIN meters m ON m.id = r.meter_id
         WHERE m.tenant_id = $1 AND m.is_active = true
           AND r.timestamp >= NOW() - INTERVAL '24 hours'
           ${buildingFilter}
         GROUP BY r.meter_id
       ),
       baseline AS (
         SELECT r.meter_id, AVG(r.power_kw::numeric) AS baseline_avg
         FROM readings r
         INNER JOIN meters m ON m.id = r.meter_id
         WHERE m.tenant_id = $1 AND m.is_active = true
           AND r.timestamp >= NOW() - INTERVAL '8 days'
           AND r.timestamp < NOW() - INTERVAL '24 hours'
           ${buildingFilter}
         GROUP BY r.meter_id
       )
       SELECT rc.meter_id, m.name AS meter_name, m.building_id,
              rc.recent_avg::float, bl.baseline_avg::float
       FROM recent rc
       INNER JOIN baseline bl ON bl.meter_id = rc.meter_id AND bl.baseline_avg > 0
       INNER JOIN meters m ON m.id = rc.meter_id
       WHERE ABS(rc.recent_avg - bl.baseline_avg) / bl.baseline_avg * 100 > ${deviationPct}`,
      params,
    );

    return rows.map((r) => {
      const pct = Math.round(Math.abs(r.recent_avg - r.baseline_avg) / r.baseline_avg * 100);
      return {
        targetId: r.meter_id,
        buildingId: r.building_id,
        triggeredValue: r.recent_avg,
        thresholdValue: r.baseline_avg,
        message: `${r.meter_name}: quiebre de tendencia ${pct}% (umbral: ${deviationPct}%)`,
      };
    });
  }

  /**
   * NULL_SPIKE: > N% of readings in last 6h have NULL power_kw for a meter.
   * config.nullPct (default 20)
   */
  private async evaluateNullSpike(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const nullPct = (rule.config as Record<string, number>).nullPct ?? 20;
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      meter_id: string;
      meter_name: string;
      building_id: string;
      total_count: number;
      null_count: number;
      null_pct: number;
    }> = await this.ds.query(
      `SELECT r.meter_id, m.name AS meter_name, m.building_id,
              COUNT(*)::int AS total_count,
              COUNT(*) FILTER (WHERE r.power_kw IS NULL)::int AS null_count,
              ROUND(100.0 * COUNT(*) FILTER (WHERE r.power_kw IS NULL) / NULLIF(COUNT(*), 0), 1)::float AS null_pct
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE m.tenant_id = $1 AND m.is_active = true
         AND r.timestamp >= NOW() - INTERVAL '6 hours'
         ${buildingFilter}
       GROUP BY r.meter_id, m.name, m.building_id
       HAVING COUNT(*) >= 4
         AND ROUND(100.0 * COUNT(*) FILTER (WHERE r.power_kw IS NULL) / NULLIF(COUNT(*), 0), 1) > ${nullPct}`,
      params,
    );

    return rows.map((r) => ({
      targetId: r.meter_id,
      buildingId: r.building_id,
      triggeredValue: r.null_pct,
      thresholdValue: nullPct,
      message: `${r.meter_name}: ${r.null_count}/${r.total_count} lecturas nulas (${r.null_pct}%, umbral: ${nullPct}%)`,
    }));
  }

  /**
   * VOLUME_ANOMALY: readings count in last 6h deviates > N% from same 6h window 7 days ago.
   * config.deviationPct (default 50)
   */
  private async evaluateVolumeAnomaly(
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
      current_count: number;
      baseline_count: number;
    }> = await this.ds.query(
      `WITH current_vol AS (
         SELECT r.meter_id, COUNT(*)::int AS current_count
         FROM readings r
         INNER JOIN meters m ON m.id = r.meter_id
         WHERE m.tenant_id = $1 AND m.is_active = true
           AND r.timestamp >= NOW() - INTERVAL '6 hours'
           ${buildingFilter}
         GROUP BY r.meter_id
       ),
       baseline_vol AS (
         SELECT r.meter_id, COUNT(*)::int AS baseline_count
         FROM readings r
         INNER JOIN meters m ON m.id = r.meter_id
         WHERE m.tenant_id = $1 AND m.is_active = true
           AND r.timestamp >= NOW() - INTERVAL '7 days 6 hours'
           AND r.timestamp < NOW() - INTERVAL '7 days'
           ${buildingFilter}
         GROUP BY r.meter_id
       )
       SELECT cv.meter_id, m.name AS meter_name, m.building_id,
              cv.current_count, bv.baseline_count
       FROM current_vol cv
       INNER JOIN baseline_vol bv ON bv.meter_id = cv.meter_id AND bv.baseline_count > 0
       INNER JOIN meters m ON m.id = cv.meter_id
       WHERE ABS(cv.current_count - bv.baseline_count)::float / bv.baseline_count * 100 > ${deviationPct}`,
      params,
    );

    return rows.map((r) => {
      const pct = Math.round(Math.abs(r.current_count - r.baseline_count) / r.baseline_count * 100);
      return {
        targetId: r.meter_id,
        buildingId: r.building_id,
        triggeredValue: r.current_count,
        thresholdValue: r.baseline_count,
        message: `${r.meter_name}: volumen lecturas desvía ${pct}% (${r.current_count} vs ${r.baseline_count}, umbral: ${deviationPct}%)`,
      };
    });
  }
}
