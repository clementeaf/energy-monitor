import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ReadingQuality } from '../../common/constants/reading-quality';
import { enrichReadingRow, type ReadingRow } from '../../lib/reading-response';
import type { CreateMeasurementDto } from './dto/create-measurement.dto';

const INGRESS_SOURCE = 'api_ingress';

interface MeterScopeRow {
  tenant_id: string;
  timezone: string;
}

/**
 * Writes readings from external API ingress (POST /v1/measurements).
 */
@Injectable()
export class MeasurementsIngressService {
  private readonly logger = new Logger(MeasurementsIngressService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Inserts a measurement for a meter scoped to the API key tenant/buildings.
   * @param tenantId - Tenant from API key
   * @param buildingIds - Building scope from API key (empty = all)
   * @param dto - Measurement payload
   * @returns Enriched reading row with timezone fields
   */
  async create(
    tenantId: string,
    buildingIds: string[],
    dto: CreateMeasurementDto,
  ): Promise<ReturnType<typeof enrichReadingRow>> {
    const meter = await this.resolveMeterScope(tenantId, buildingIds, dto.meterId);
    const quality: ReadingQuality = dto.quality ?? 'measured';

    const params: unknown[] = [
      tenantId,
      dto.meterId,
      dto.timestamp,
      dto.metrics.powerKw,
      dto.metrics.energyKwhTotal,
      dto.metrics.voltageL1 ?? null,
      dto.metrics.voltageL2 ?? null,
      dto.metrics.voltageL3 ?? null,
      dto.metrics.currentL1 ?? null,
      dto.metrics.currentL2 ?? null,
      dto.metrics.currentL3 ?? null,
      dto.metrics.reactivePowerKvar ?? null,
      dto.metrics.powerFactor ?? null,
      dto.metrics.frequencyHz ?? null,
      dto.metrics.thdVoltagePct ?? null,
      dto.metrics.thdCurrentPct ?? null,
      dto.metrics.phaseImbalancePct ?? null,
      quality,
      INGRESS_SOURCE,
    ];

    let inserted: ReadingRow[];
    try {
      inserted = await this.dataSource.query(
        `INSERT INTO readings (
           tenant_id, meter_id, timestamp,
           voltage_l1, voltage_l2, voltage_l3,
           current_l1, current_l2, current_l3,
           power_kw, reactive_power_kvar, power_factor, frequency_hz,
           energy_kwh_total,
           thd_voltage_pct, thd_current_pct, phase_imbalance_pct,
           quality, source, ingested_at
         ) VALUES (
           $1, $2, $3::timestamptz,
           $6, $7, $8,
           $9, $10, $11,
           $4, $12, $13, $14,
           $5,
           $15, $16, $17,
           $18::reading_quality, $19, NOW()
         )
         RETURNING
           id::text,
           meter_id::text,
           timestamp::text,
           voltage_l1::text,
           voltage_l2::text,
           voltage_l3::text,
           current_l1::text,
           current_l2::text,
           current_l3::text,
           power_kw::text,
           reactive_power_kvar::text,
           power_factor::text,
           frequency_hz::text,
           energy_kwh_total::text,
           thd_voltage_pct::text,
           thd_current_pct::text,
           phase_imbalance_pct::text,
           quality::text,
           source,
           ingested_at::text`,
        params,
      );
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          'Duplicate measurement for meter, timestamp, and source api_ingress',
        );
      }
      throw err;
    }

    if (!inserted.length) {
      throw new ConflictException(
        'Duplicate measurement for meter, timestamp, and source api_ingress',
      );
    }

    if (dto.externalRef) {
      this.logger.debug(
        `Ingress externalRef meter=${dto.meterId} ref=${dto.externalRef}`,
      );
    }

    return enrichReadingRow(inserted[0], meter.timezone);
  }

  /**
   * Resolves meter within tenant/building scope or throws 403/404.
   */
  private async resolveMeterScope(
    tenantId: string,
    buildingIds: string[],
    meterId: string,
  ): Promise<MeterScopeRow> {
    const scopeParams: unknown[] = [meterId, tenantId];
    const conditions = ['m.id = $1', 'm.tenant_id = $2'];

    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${3 + i}`);
      conditions.push(`m.building_id IN (${placeholders.join(', ')})`);
      scopeParams.push(...buildingIds);
    }

    const inScope = await this.dataSource.query<MeterScopeRow[]>(
      `SELECT m.tenant_id::text, COALESCE(b.timezone, 'UTC') AS timezone
       FROM meters m
       INNER JOIN buildings b ON b.id = m.building_id
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      scopeParams,
    );

    if (inScope.length > 0) {
      return inScope[0];
    }

    const anyMeter = await this.dataSource.query<{ tenant_id: string }[]>(
      `SELECT tenant_id::text FROM meters WHERE id = $1 LIMIT 1`,
      [meterId],
    );

    if (!anyMeter.length) {
      throw new NotFoundException('Meter not found');
    }

    throw new ForbiddenException('Meter not accessible for this API key');
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
