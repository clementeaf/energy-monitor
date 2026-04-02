import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertEvaluator, EvaluationResult } from './evaluator.interface';
import { AlertRule } from '../../platform/entities/alert-rule.entity';
import { BUS_ERROR, MODBUS_TIMEOUT, CRC_ERROR } from '../alert-type-codes';

@Injectable()
export class BusEvaluator implements AlertEvaluator {
  readonly supportedCodes = [BUS_ERROR, MODBUS_TIMEOUT, CRC_ERROR];

  constructor(private readonly ds: DataSource) {}

  async evaluate(rule: AlertRule, tenantId: string): Promise<EvaluationResult[]> {
    switch (rule.alertTypeCode) {
      case CRC_ERROR:
        return this.evaluateCrcErrors(rule, tenantId);
      case MODBUS_TIMEOUT:
        return this.evaluateModbusTimeout(rule, tenantId);
      case BUS_ERROR:
        return this.evaluateBusError(rule, tenantId);
      default:
        return [];
    }
  }

  /**
   * CRC_ERROR: modbus_crc_errors in latest reading > threshold.
   * config.maxCrcErrors (default 5)
   */
  private async evaluateCrcErrors(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const maxCrc = (rule.config as Record<string, number>).maxCrcErrors ?? 5;
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      meter_id: string;
      meter_name: string;
      building_id: string;
      modbus_crc_errors: number;
    }> = await this.ds.query(
      `SELECT DISTINCT ON (r.meter_id)
         r.meter_id, m.name AS meter_name, m.building_id,
         r.modbus_crc_errors
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE m.tenant_id = $1
         AND m.is_active = true
         AND r.timestamp >= NOW() - INTERVAL '30 minutes'
         AND r.modbus_crc_errors IS NOT NULL
         ${buildingFilter}
       ORDER BY r.meter_id, r.timestamp DESC`,
      params,
    );

    return rows
      .filter((r) => r.modbus_crc_errors > maxCrc)
      .map((r) => ({
        targetId: r.meter_id,
        buildingId: r.building_id,
        triggeredValue: r.modbus_crc_errors,
        thresholdValue: maxCrc,
        message: `${r.meter_name}: ${r.modbus_crc_errors} errores CRC (umbral: ${maxCrc})`,
      }));
  }

  /**
   * MODBUS_TIMEOUT: meter with crc_errors_last_poll above threshold (proxy for timeout).
   * config.maxErrors (default 10)
   */
  private async evaluateModbusTimeout(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const maxErrors = (rule.config as Record<string, number>).maxErrors ?? 10;
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      id: string;
      name: string;
      building_id: string;
      crc_errors_last_poll: number;
    }> = await this.ds.query(
      `SELECT m.id, m.name, m.building_id, m.crc_errors_last_poll
       FROM meters m
       WHERE m.tenant_id = $1
         AND m.is_active = true
         AND m.crc_errors_last_poll > $${rule.buildingId ? 3 : 2}
         ${buildingFilter}`,
      [...params, maxErrors],
    );

    return rows.map((r) => ({
      targetId: r.id,
      buildingId: r.building_id,
      triggeredValue: r.crc_errors_last_poll,
      thresholdValue: maxErrors,
      message: `${r.name}: ${r.crc_errors_last_poll} errores Modbus (umbral: ${maxErrors})`,
    }));
  }

  /**
   * BUS_ERROR: multiple meters on same bus_id are offline simultaneously.
   * config.minOfflineOnBus (default 3)
   */
  private async evaluateBusError(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]> {
    const minOffline = (rule.config as Record<string, number>).minOfflineOnBus ?? 3;
    const buildingFilter = rule.buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (rule.buildingId) params.push(rule.buildingId);

    const rows: Array<{
      bus_id: string;
      building_id: string;
      offline_count: number;
    }> = await this.ds.query(
      `SELECT m.bus_id, m.building_id, COUNT(*)::int AS offline_count
       FROM meters m
       LEFT JOIN LATERAL (
         SELECT 1 FROM readings r
         WHERE r.meter_id = m.id AND r.timestamp >= NOW() - INTERVAL '30 minutes'
         LIMIT 1
       ) recent ON true
       WHERE m.tenant_id = $1
         AND m.is_active = true
         AND m.bus_id IS NOT NULL
         AND recent IS NULL
         ${buildingFilter}
       GROUP BY m.bus_id, m.building_id
       HAVING COUNT(*) >= ${minOffline}`,
      params,
    );

    return rows.map((r) => ({
      targetId: r.bus_id,
      buildingId: r.building_id,
      triggeredValue: r.offline_count,
      thresholdValue: minOffline,
      message: `Bus ${r.bus_id}: ${r.offline_count} medidores offline (posible fallo de bus)`,
    }));
  }
}
