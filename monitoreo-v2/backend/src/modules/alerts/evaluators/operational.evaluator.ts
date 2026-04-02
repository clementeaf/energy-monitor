import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertEvaluator, EvaluationResult } from './evaluator.interface';
import { AlertRule } from '../../platform/entities/alert-rule.entity';
import {
  METER_TAMPER,
  CONFIG_CHANGE,
  FIRMWARE_MISMATCH,
} from '../alert-type-codes';

@Injectable()
export class OperationalEvaluator implements AlertEvaluator {
  readonly supportedCodes = [METER_TAMPER, CONFIG_CHANGE, FIRMWARE_MISMATCH];

  constructor(private readonly ds: DataSource) {}

  async evaluate(rule: AlertRule, tenantId: string): Promise<EvaluationResult[]> {
    switch (rule.alertTypeCode) {
      case METER_TAMPER:
        return this.evaluateMeterTamper(rule, tenantId);
      case FIRMWARE_MISMATCH:
        return this.evaluateFirmwareMismatch(rule, tenantId);
      case CONFIG_CHANGE:
        // CONFIG_CHANGE is event-driven (audit log), not evaluated by cron
        return [];
      default:
        return [];
    }
  }

  /**
   * METER_TAMPER: digital input indicating tamper (di_status = 'open' on a sealed meter).
   */
  private async evaluateMeterTamper(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      id: string;
      name: string;
      building_id: string;
    }> = await this.ds.query(
      `SELECT m.id, m.name, m.building_id
       FROM meters m
       WHERE m.tenant_id = $1
         AND m.is_active = true
         AND m.di_status = 'open'
         ${buildingFilter}`,
      params,
    );

    return rows.map((r) => ({
      targetId: r.id,
      buildingId: r.building_id,
      triggeredValue: 1,
      thresholdValue: 0,
      message: `${r.name}: posible manipulación detectada (DI abierto)`,
    }));
  }

  /**
   * FIRMWARE_MISMATCH: concentrators with firmware != expected version.
   * config.expectedVersion (required)
   */
  private async evaluateFirmwareMismatch(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const expectedVersion = (rule.config as Record<string, string>).expectedVersion;
    if (!expectedVersion) return [];

    const buildingFilter = rule.buildingId ? 'AND c.building_id = $3' : '';
    const params: unknown[] = [tenantId, expectedVersion];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      id: string;
      name: string;
      building_id: string;
      firmware_version: string;
    }> = await this.ds.query(
      `SELECT c.id, c.name, c.building_id, c.firmware_version
       FROM concentrators c
       WHERE c.tenant_id = $1
         AND c.firmware_version IS NOT NULL
         AND c.firmware_version != $2
         ${buildingFilter}`,
      params,
    );

    return rows.map((r) => ({
      targetId: r.id,
      buildingId: r.building_id,
      triggeredValue: 0,
      thresholdValue: 0,
      message: `Concentrador ${r.name}: firmware ${r.firmware_version} != esperado ${expectedVersion}`,
    }));
  }
}
