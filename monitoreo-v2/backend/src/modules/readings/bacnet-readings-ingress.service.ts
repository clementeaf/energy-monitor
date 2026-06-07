import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ReadingQuality } from '../../common/constants/reading-quality';
import { NormalizationService, type RegisterMappingInput } from '../../lib/normalization.service';

const INGRESS_SOURCE = 'bacnet';

interface BacnetIngressInput {
  tenantId: string;
  meterId: string;
  timestamp: string;
  deviceProfile: string;
  rawRegisters: Record<string, unknown>;
  quality?: ReadingQuality;
}

interface MappingRow {
  register_key: string;
  target_field: string;
  scale_factor: string;
  unit: string | null;
}

/**
 * Promotes BACnet register reads into unified readings via register_mappings.
 */
@Injectable()
export class BacnetReadingsIngressService {
  private readonly logger = new Logger(BacnetReadingsIngressService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly normalizationService: NormalizationService,
  ) {}

  /**
   * Loads mappings, normalizes raw BACnet properties, and inserts a reading row.
   * @param input - Tenant-scoped meter reading from BACnet poll
   * @returns true when a row was inserted
   */
  async ingestFromBacnetRegisters(input: BacnetIngressInput): Promise<boolean> {
    const scoped = await this.dataSource.query<{ tenant_id: string }[]>(
      `SELECT tenant_id::text FROM meters WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [input.meterId, input.tenantId],
    );
    if (!scoped.length) {
      this.logger.debug(`BACnet ingress skipped: meter ${input.meterId} not in tenant`);
      return false;
    }

    const mappings = await this.loadMappings(input.tenantId, input.deviceProfile);
    if (mappings.length === 0) {
      this.logger.debug(
        `BACnet ingress skipped: no mappings for profile ${input.deviceProfile}`,
      );
      return false;
    }

    const normalized = this.normalizationService.apply(mappings, input.rawRegisters);
    const powerKw = normalized.power_kw;
    const energyKwh = normalized.energy_kwh_total;
    if (powerKw === undefined || energyKwh === undefined) {
      return false;
    }

    const quality: ReadingQuality = input.quality ?? 'measured';

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
          input.tenantId,
          input.meterId,
          input.timestamp,
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
   * Resolves tenant-specific register_mappings with global template fallback.
   */
  private async loadMappings(
    tenantId: string,
    deviceProfile: string,
  ): Promise<RegisterMappingInput[]> {
    const rows = await this.dataSource.query<MappingRow[]>(
      `SELECT DISTINCT ON (register_key)
         register_key,
         target_field,
         scale_factor::text,
         unit
       FROM register_mappings
       WHERE protocol = 'bacnet'
         AND device_profile = $2
         AND (tenant_id = $1 OR tenant_id IS NULL)
       ORDER BY register_key, tenant_id NULLS LAST`,
      [tenantId, deviceProfile],
    );

    return rows.map((row) => ({
      registerKey: row.register_key,
      targetField: row.target_field,
      scaleFactor: Number(row.scale_factor),
      unit: row.unit,
    }));
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
