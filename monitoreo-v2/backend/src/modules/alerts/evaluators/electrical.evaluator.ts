import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertEvaluator, EvaluationResult } from './evaluator.interface';
import { AlertRule } from '../../platform/entities/alert-rule.entity';
import {
  VOLTAGE_OUT_OF_RANGE,
  LOW_POWER_FACTOR,
  HIGH_THD,
  PHASE_IMBALANCE,
  FREQUENCY_OUT_OF_RANGE,
  OVERCURRENT,
  BREAKER_TRIP,
  NEUTRAL_FAULT,
} from '../alert-type-codes';

interface LatestReadingRow {
  meter_id: string;
  meter_name: string;
  building_id: string;
  voltage_l1: string | null;
  voltage_l2: string | null;
  voltage_l3: string | null;
  current_l1: string | null;
  current_l2: string | null;
  current_l3: string | null;
  power_factor: string | null;
  thd_voltage_pct: string | null;
  thd_current_pct: string | null;
  phase_imbalance_pct: string | null;
  frequency_hz: string | null;
  breaker_status: string | null;
  nominal_voltage: string | null;
  nominal_current: string | null;
}

@Injectable()
export class ElectricalEvaluator implements AlertEvaluator {
  readonly supportedCodes = [
    VOLTAGE_OUT_OF_RANGE,
    LOW_POWER_FACTOR,
    HIGH_THD,
    PHASE_IMBALANCE,
    FREQUENCY_OUT_OF_RANGE,
    OVERCURRENT,
    BREAKER_TRIP,
    NEUTRAL_FAULT,
  ];

  constructor(private readonly ds: DataSource) {}

  async evaluate(rule: AlertRule, tenantId: string): Promise<EvaluationResult[]> {
    const rows = await this.getLatestReadings(tenantId, rule.buildingId);
    const results: EvaluationResult[] = [];

    for (const row of rows) {
      const result = this.evaluateRow(rule, row);
      if (result) results.push(result);
    }

    return results;
  }

  private evaluateRow(rule: AlertRule, row: LatestReadingRow): EvaluationResult | null {
    const cfg = rule.config as Record<string, number>;

    switch (rule.alertTypeCode) {
      case VOLTAGE_OUT_OF_RANGE: {
        const nominal = parseFloat(row.nominal_voltage ?? '220');
        const tolerancePct = cfg.tolerancePct ?? 10;
        const min = nominal * (1 - tolerancePct / 100);
        const max = nominal * (1 + tolerancePct / 100);
        const voltages = [row.voltage_l1, row.voltage_l2, row.voltage_l3]
          .map((v) => (v ? parseFloat(v) : null))
          .filter((v): v is number => v !== null);
        const worst = voltages.find((v) => v < min || v > max);
        if (worst === undefined) return null;
        return {
          targetId: row.meter_id,
          buildingId: row.building_id,
          triggeredValue: worst,
          thresholdValue: worst < min ? min : max,
          message: `${row.meter_name}: voltaje ${worst.toFixed(1)}V fuera de rango [${min.toFixed(0)}-${max.toFixed(0)}V]`,
        };
      }

      case LOW_POWER_FACTOR: {
        const minPf = cfg.minPowerFactor ?? 0.92;
        const pf = row.power_factor ? parseFloat(row.power_factor) : null;
        if (pf === null || pf >= minPf) return null;
        return {
          targetId: row.meter_id,
          buildingId: row.building_id,
          triggeredValue: pf,
          thresholdValue: minPf,
          message: `${row.meter_name}: factor de potencia ${pf.toFixed(3)} < ${minPf}`,
        };
      }

      case HIGH_THD: {
        const maxThdV = cfg.maxThdVoltagePct ?? 8;
        const maxThdI = cfg.maxThdCurrentPct ?? 20;
        const thdV = row.thd_voltage_pct ? parseFloat(row.thd_voltage_pct) : null;
        const thdI = row.thd_current_pct ? parseFloat(row.thd_current_pct) : null;
        if (thdV !== null && thdV > maxThdV) {
          return {
            targetId: row.meter_id,
            buildingId: row.building_id,
            triggeredValue: thdV,
            thresholdValue: maxThdV,
            message: `${row.meter_name}: THD voltaje ${thdV.toFixed(1)}% > ${maxThdV}%`,
          };
        }
        if (thdI !== null && thdI > maxThdI) {
          return {
            targetId: row.meter_id,
            buildingId: row.building_id,
            triggeredValue: thdI,
            thresholdValue: maxThdI,
            message: `${row.meter_name}: THD corriente ${thdI.toFixed(1)}% > ${maxThdI}%`,
          };
        }
        return null;
      }

      case PHASE_IMBALANCE: {
        const maxImbalancePct = cfg.maxImbalancePct ?? 5;
        const imb = row.phase_imbalance_pct ? parseFloat(row.phase_imbalance_pct) : null;
        if (imb === null || imb <= maxImbalancePct) return null;
        return {
          targetId: row.meter_id,
          buildingId: row.building_id,
          triggeredValue: imb,
          thresholdValue: maxImbalancePct,
          message: `${row.meter_name}: desequilibrio de fases ${imb.toFixed(1)}% > ${maxImbalancePct}%`,
        };
      }

      case FREQUENCY_OUT_OF_RANGE: {
        const minHz = cfg.minHz ?? 49.5;
        const maxHz = cfg.maxHz ?? 50.5;
        const freq = row.frequency_hz ? parseFloat(row.frequency_hz) : null;
        if (freq === null || (freq >= minHz && freq <= maxHz)) return null;
        return {
          targetId: row.meter_id,
          buildingId: row.building_id,
          triggeredValue: freq,
          thresholdValue: freq < minHz ? minHz : maxHz,
          message: `${row.meter_name}: frecuencia ${freq.toFixed(2)}Hz fuera de [${minHz}-${maxHz}Hz]`,
        };
      }

      case OVERCURRENT: {
        const tolerancePct = cfg.tolerancePct ?? 20;
        const nominal = row.nominal_current ? parseFloat(row.nominal_current) : null;
        if (nominal === null) return null;
        const maxA = nominal * (1 + tolerancePct / 100);
        const currents = [row.current_l1, row.current_l2, row.current_l3]
          .map((c) => (c ? parseFloat(c) : null))
          .filter((c): c is number => c !== null);
        const worst = currents.find((c) => c > maxA);
        if (worst === undefined) return null;
        return {
          targetId: row.meter_id,
          buildingId: row.building_id,
          triggeredValue: worst,
          thresholdValue: maxA,
          message: `${row.meter_name}: corriente ${worst.toFixed(1)}A > ${maxA.toFixed(1)}A (${tolerancePct}% sobre nominal)`,
        };
      }

      case BREAKER_TRIP: {
        if (row.breaker_status !== 'open') return null;
        return {
          targetId: row.meter_id,
          buildingId: row.building_id,
          triggeredValue: 1,
          thresholdValue: 0,
          message: `${row.meter_name}: breaker disparado (open)`,
        };
      }

      case NEUTRAL_FAULT: {
        const voltages = [row.voltage_l1, row.voltage_l2, row.voltage_l3]
          .map((v) => (v ? parseFloat(v) : null))
          .filter((v): v is number => v !== null);
        if (voltages.length < 3) return null;
        const avg = voltages.reduce((a, b) => a + b, 0) / voltages.length;
        const maxDevPct = cfg.maxNeutralDeviationPct ?? 15;
        const deviations = voltages.map((v) => Math.abs((v - avg) / avg) * 100);
        const worstDev = Math.max(...deviations);
        if (worstDev <= maxDevPct) return null;
        return {
          targetId: row.meter_id,
          buildingId: row.building_id,
          triggeredValue: worstDev,
          thresholdValue: maxDevPct,
          message: `${row.meter_name}: posible falla de neutro, desviación ${worstDev.toFixed(1)}% entre fases`,
        };
      }

      default:
        return null;
    }
  }

  private async getLatestReadings(
    tenantId: string,
    buildingId: string | null,
  ): Promise<LatestReadingRow[]> {
    const buildingFilter = buildingId ? 'AND m.building_id = $2' : '';
    const params: unknown[] = [tenantId];
    if (buildingId) params.push(buildingId);

    return this.ds.query(
      `SELECT DISTINCT ON (r.meter_id)
         r.meter_id, m.name AS meter_name, m.building_id,
         r.voltage_l1, r.voltage_l2, r.voltage_l3,
         r.current_l1, r.current_l2, r.current_l3,
         r.power_factor, r.thd_voltage_pct, r.thd_current_pct,
         r.phase_imbalance_pct, r.frequency_hz, r.breaker_status,
         m.nominal_voltage, m.nominal_current
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE m.tenant_id = $1
         AND m.is_active = true
         AND r.timestamp >= NOW() - INTERVAL '30 minutes'
         ${buildingFilter}
       ORDER BY r.meter_id, r.timestamp DESC`,
      params,
    );
  }
}
