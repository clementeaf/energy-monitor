import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertEvaluator, EvaluationResult } from './evaluator.interface';
import { AlertRule } from '../../platform/entities/alert-rule.entity';
import {
  METER_OFFLINE,
  CONCENTRATOR_OFFLINE,
  COMM_DEGRADED,
} from '../alert-type-codes';

interface OfflineMeterRow {
  id: string;
  name: string;
  building_id: string;
  minutes_since: number;
}

interface OfflineConcentratorRow {
  id: string;
  name: string;
  building_id: string;
  minutes_since: number;
}

@Injectable()
export class CommunicationEvaluator implements AlertEvaluator {
  readonly supportedCodes = [METER_OFFLINE, CONCENTRATOR_OFFLINE, COMM_DEGRADED];

  constructor(private readonly ds: DataSource) {}

  async evaluate(rule: AlertRule, tenantId: string): Promise<EvaluationResult[]> {
    switch (rule.alertTypeCode) {
      case METER_OFFLINE:
        return this.evaluateMeterOffline(rule, tenantId);
      case CONCENTRATOR_OFFLINE:
        return this.evaluateConcentratorOffline(rule, tenantId);
      case COMM_DEGRADED:
        return this.evaluateCommDegraded(rule, tenantId);
      default:
        return [];
    }
  }

  /**
   * METER_OFFLINE: meter has no reading in the last N minutes.
   * config.offlineMinutes (default 30)
   */
  private async evaluateMeterOffline(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const offlineMinutes = (rule.config as Record<string, number>).offlineMinutes ?? 30;
    const buildingFilter = rule.buildingId
      ? 'AND m.building_id = $3'
      : '';
    const params: unknown[] = [tenantId, offlineMinutes];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: OfflineMeterRow[] = await this.ds.query(
      `SELECT m.id, m.name, m.building_id,
              EXTRACT(EPOCH FROM (NOW() - MAX(r.timestamp))) / 60 AS minutes_since
       FROM meters m
       LEFT JOIN readings r ON r.meter_id = m.id
       WHERE m.tenant_id = $1
         AND m.is_active = true
         ${buildingFilter}
       GROUP BY m.id, m.name, m.building_id
       HAVING MAX(r.timestamp) IS NULL
          OR EXTRACT(EPOCH FROM (NOW() - MAX(r.timestamp))) / 60 > $2`,
      params,
    );

    return rows.map((r) => ({
      targetId: r.id,
      buildingId: r.building_id,
      triggeredValue: Math.round(r.minutes_since ?? 999),
      thresholdValue: offlineMinutes,
      message: `Medidor ${r.name} sin comunicación hace ${Math.round(r.minutes_since ?? 999)} min (umbral: ${offlineMinutes} min)`,
    }));
  }

  /**
   * CONCENTRATOR_OFFLINE: no heartbeat in N minutes.
   * config.offlineMinutes (default 30)
   */
  private async evaluateConcentratorOffline(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const offlineMinutes = (rule.config as Record<string, number>).offlineMinutes ?? 30;
    const buildingFilter = rule.buildingId
      ? 'AND c.building_id = $3'
      : '';
    const params: unknown[] = [tenantId, offlineMinutes];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: OfflineConcentratorRow[] = await this.ds.query(
      `SELECT c.id, c.name, c.building_id,
              EXTRACT(EPOCH FROM (NOW() - c.last_heartbeat_at)) / 60 AS minutes_since
       FROM concentrators c
       WHERE c.tenant_id = $1
         AND c.status != 'maintenance'
         AND (c.last_heartbeat_at IS NULL
              OR EXTRACT(EPOCH FROM (NOW() - c.last_heartbeat_at)) / 60 > $2)
         ${buildingFilter}`,
      params,
    );

    return rows.map((r) => ({
      targetId: r.id,
      buildingId: r.building_id,
      triggeredValue: Math.round(r.minutes_since ?? 999),
      thresholdValue: offlineMinutes,
      message: `Concentrador ${r.name} sin heartbeat hace ${Math.round(r.minutes_since ?? 999)} min`,
    }));
  }

  /**
   * COMM_DEGRADED: < N% of expected readings in last hour.
   * config.minReadingsPctPerHour (default 80)
   * config.expectedReadingsPerHour (default 4, i.e. 15-min interval)
   */
  private async evaluateCommDegraded(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const cfg = rule.config as Record<string, number>;
    const minPct = cfg.minReadingsPctPerHour ?? 80;
    const expected = cfg.expectedReadingsPerHour ?? 4;
    const buildingFilter = rule.buildingId
      ? 'AND m.building_id = $3'
      : '';
    const params: unknown[] = [tenantId, expected];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      id: string;
      name: string;
      building_id: string;
      reading_count: number;
    }> = await this.ds.query(
      `SELECT m.id, m.name, m.building_id, COUNT(r.id)::int AS reading_count
       FROM meters m
       LEFT JOIN readings r ON r.meter_id = m.id
         AND r.timestamp >= NOW() - INTERVAL '1 hour'
       WHERE m.tenant_id = $1
         AND m.is_active = true
         ${buildingFilter}
       GROUP BY m.id, m.name, m.building_id
       HAVING COUNT(r.id)::float / $2 * 100 < ${minPct}`,
      params,
    );

    return rows.map((r) => {
      const pct = Math.round((r.reading_count / expected) * 100);
      return {
        targetId: r.id,
        buildingId: r.building_id,
        triggeredValue: pct,
        thresholdValue: minPct,
        message: `Medidor ${r.name}: ${pct}% lecturas recibidas (umbral: ${minPct}%)`,
      };
    });
  }
}
