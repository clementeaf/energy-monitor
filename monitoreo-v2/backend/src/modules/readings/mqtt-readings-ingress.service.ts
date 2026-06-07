import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Integration } from '../platform/entities/integration.entity';
import { NormalizationService } from '../../lib/normalization.service';
import { normalizeIotVariableRow, SIEMENS_POC3000_IOT_MAPPINGS } from '../../lib/iot-variable-mappings';
import type { ReadingQuality } from '../../common/constants/reading-quality';

const INGRESS_SOURCE = 'mqtt';

interface MqttReadingPayload {
  meterId: string;
  timestamp: string;
  quality?: ReadingQuality;
  variables?: Record<string, unknown>;
}

/**
 * Promotes MQTT integration payloads into unified readings with source=mqtt.
 */
@Injectable()
export class MqttReadingsIngressService {
  private readonly logger = new Logger(MqttReadingsIngressService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly normalizationService: NormalizationService,
  ) {}

  /**
   * Parses an MQTT message and inserts a normalized reading when valid.
   * @param integration - Integration row (tenant scope)
   * @param payload - Raw MQTT message buffer
   * @returns true when a row was inserted
   */
  async ingestFromMqttMessage(integration: Integration, payload: Buffer): Promise<boolean> {
    const parsed = this.parsePayload(payload);
    if (!parsed) return false;

    const scoped = await this.dataSource.query<{ tenant_id: string }[]>(
      `SELECT tenant_id::text FROM meters WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [parsed.meterId, integration.tenantId],
    );
    if (!scoped.length) {
      this.logger.debug(`MQTT ingress skipped: meter ${parsed.meterId} not in tenant`);
      return false;
    }

    const rawVariables = parsed.variables ?? {};
    const normalized = normalizeIotVariableRow(
      this.normalizationService.apply.bind(this.normalizationService),
      rawVariables,
    );

    const powerKw = normalized.power_kw;
    const energyKwh = normalized.energy_kwh_total;
    if (powerKw === undefined || energyKwh === undefined) {
      return false;
    }

    const quality: ReadingQuality = parsed.quality ?? 'measured';

    try {
      const inserted = await this.dataSource.query<{ id: string }[]>(
        `INSERT INTO readings (
           tenant_id, meter_id, timestamp,
           voltage_l1, voltage_l2, voltage_l3,
           current_l1, current_l2, current_l3,
           power_kw, reactive_power_kvar, power_factor, frequency_hz,
           energy_kwh_total,
           thd_voltage_pct, thd_current_pct,
           quality, source, ingested_at
         ) VALUES (
           $1, $2, $3::timestamptz,
           $4, $5, $6,
           $7, $8, $9,
           $10, $11, $12, $13,
           $14,
           $15, $16,
           $17::reading_quality, $18, NOW()
         )
         ON CONFLICT DO NOTHING
         RETURNING id::text`,
        [
          integration.tenantId,
          parsed.meterId,
          parsed.timestamp,
          normalized.voltage_l1 ?? null,
          normalized.voltage_l2 ?? null,
          normalized.voltage_l3 ?? null,
          normalized.current_l1 ?? null,
          normalized.current_l2 ?? null,
          normalized.current_l3 ?? null,
          powerKw,
          normalized.reactive_power_kvar ?? null,
          normalized.power_factor ?? null,
          normalized.frequency_hz ?? null,
          energyKwh,
          normalized.thd_voltage_pct ?? null,
          normalized.thd_current_pct ?? null,
          quality,
          INGRESS_SOURCE,
        ],
      );
      return inserted.length > 0;
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) return false;
      throw err;
    }
  }

  /**
   * Parses MQTT JSON payload into meter reading structure.
   */
  private parsePayload(payload: Buffer): MqttReadingPayload | null {
    try {
      const text = payload.toString('utf8');
      const data: unknown = JSON.parse(text);
      if (typeof data !== 'object' || data === null) return null;

      const record = data as Record<string, unknown>;
      const meterId = record.meterId;
      const timestamp = record.timestamp;
      if (typeof meterId !== 'string' || typeof timestamp !== 'string') return null;

      const variables =
        typeof record.variables === 'object' && record.variables !== null
          ? (record.variables as Record<string, unknown>)
          : this.extractFlatVariables(record);

      const quality =
        typeof record.quality === 'string' &&
        ['measured', 'estimated', 'invalid', 'unknown'].includes(record.quality)
          ? (record.quality as ReadingQuality)
          : undefined;

      return { meterId, timestamp, variables, quality };
    } catch {
      return null;
    }
  }

  /**
   * Treats top-level IoT variable keys as variables when variables object omitted.
   */
  private extractFlatVariables(record: Record<string, unknown>): Record<string, unknown> {
    const keys = new Set(SIEMENS_POC3000_IOT_MAPPINGS.map((m) => m.registerKey));
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (record[key] !== undefined) out[key] = record[key];
    }
    return out;
  }

  /**
   * Detects PostgreSQL unique_violation (23505).
   */
  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object'
      && err !== null
      && 'code' in err
      && (err as { code: string }).code === '23505'
    );
  }
}
