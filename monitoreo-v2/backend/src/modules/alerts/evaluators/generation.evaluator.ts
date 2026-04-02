import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertEvaluator, EvaluationResult } from './evaluator.interface';
import { AlertRule } from '../../platform/entities/alert-rule.entity';
import {
  GENERATION_LOW,
  INVERTER_FAULT,
  GRID_EXPORT_LIMIT,
} from '../alert-type-codes';

@Injectable()
export class GenerationEvaluator implements AlertEvaluator {
  readonly supportedCodes = [GENERATION_LOW, INVERTER_FAULT, GRID_EXPORT_LIMIT];

  constructor(private readonly ds: DataSource) {}

  async evaluate(rule: AlertRule, tenantId: string): Promise<EvaluationResult[]> {
    switch (rule.alertTypeCode) {
      case GENERATION_LOW:
        return this.evaluateGenerationLow(rule, tenantId);
      case INVERTER_FAULT:
        return this.evaluateInverterFault(rule, tenantId);
      case GRID_EXPORT_LIMIT:
        return this.evaluateGridExportLimit(rule, tenantId);
      default:
        return [];
    }
  }

  /**
   * GENERATION_LOW: generation meter producing < expected kW.
   * config.minGenerationKw (required)
   */
  private async evaluateGenerationLow(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const minKw = (rule.config as Record<string, number>).minGenerationKw;
    if (minKw === undefined) return [];
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      meter_id: string;
      meter_name: string;
      building_id: string;
      power_kw: string;
    }> = await this.ds.query(
      `SELECT DISTINCT ON (r.meter_id)
         r.meter_id, m.name AS meter_name, m.building_id, r.power_kw
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE m.tenant_id = $1
         AND m.meter_type = 'generation'
         AND m.is_active = true
         AND r.timestamp >= NOW() - INTERVAL '30 minutes'
         ${buildingFilter}
       ORDER BY r.meter_id, r.timestamp DESC`,
      params,
    );

    return rows
      .filter((r) => parseFloat(r.power_kw) < minKw)
      .map((r) => ({
        targetId: r.meter_id,
        buildingId: r.building_id,
        triggeredValue: parseFloat(r.power_kw),
        thresholdValue: minKw,
        message: `${r.meter_name}: generación ${parseFloat(r.power_kw).toFixed(1)} kW < mínimo ${minKw} kW`,
      }));
  }

  /**
   * INVERTER_FAULT: generation meter with alarm field set.
   */
  private async evaluateInverterFault(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      meter_id: string;
      meter_name: string;
      building_id: string;
      alarm: string;
    }> = await this.ds.query(
      `SELECT DISTINCT ON (r.meter_id)
         r.meter_id, m.name AS meter_name, m.building_id, r.alarm
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE m.tenant_id = $1
         AND m.meter_type = 'generation'
         AND m.is_active = true
         AND r.alarm IS NOT NULL
         AND r.timestamp >= NOW() - INTERVAL '30 minutes'
         ${buildingFilter}
       ORDER BY r.meter_id, r.timestamp DESC`,
      params,
    );

    return rows.map((r) => ({
      targetId: r.meter_id,
      buildingId: r.building_id,
      triggeredValue: 1,
      thresholdValue: 0,
      message: `${r.meter_name}: falla inversor — ${r.alarm}`,
    }));
  }

  /**
   * GRID_EXPORT_LIMIT: negative power (export) exceeding limit.
   * config.maxExportKw (required)
   */
  private async evaluateGridExportLimit(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const maxExport = (rule.config as Record<string, number>).maxExportKw;
    if (maxExport === undefined) return [];
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      meter_id: string;
      meter_name: string;
      building_id: string;
      power_kw: string;
    }> = await this.ds.query(
      `SELECT DISTINCT ON (r.meter_id)
         r.meter_id, m.name AS meter_name, m.building_id, r.power_kw
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE m.tenant_id = $1
         AND m.is_active = true
         AND r.power_kw::numeric < 0
         AND r.timestamp >= NOW() - INTERVAL '30 minutes'
         ${buildingFilter}
       ORDER BY r.meter_id, r.timestamp DESC`,
      params,
    );

    return rows
      .filter((r) => Math.abs(parseFloat(r.power_kw)) > maxExport)
      .map((r) => {
        const exported = Math.abs(parseFloat(r.power_kw));
        return {
          targetId: r.meter_id,
          buildingId: r.building_id,
          triggeredValue: exported,
          thresholdValue: maxExport,
          message: `${r.meter_name}: exportación ${exported.toFixed(1)} kW > límite ${maxExport} kW`,
        };
      });
  }
}
