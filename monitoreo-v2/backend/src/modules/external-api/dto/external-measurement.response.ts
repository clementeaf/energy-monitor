import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { READING_QUALITIES } from '../../../common/constants/reading-quality';
import type { ReadingResponse } from '../../../lib/reading-response';

export class ExternalMeasurementResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  meterId!: string;

  @ApiProperty({ example: '2026-06-06T12:00:00.000Z' })
  timestampUtc!: string;

  @ApiProperty({ example: 'America/Santiago' })
  timezone!: string;

  @ApiProperty({ example: '2026-06-06T08:00:00' })
  timestampLocal!: string;

  @ApiProperty({ example: '12.500' })
  powerKw!: string;

  @ApiProperty({ example: '10450.250' })
  energyKwhTotal!: string;

  @ApiProperty({ enum: READING_QUALITIES })
  quality!: string;

  @ApiProperty({ example: 'api_ingress' })
  source!: string;

  @ApiPropertyOptional({ example: '2026-06-06T12:00:01.000Z' })
  ingestedAt!: string | null;
}

/**
 * Maps an enriched reading row to external API v1 measurement response.
 */
export function toExternalMeasurement(row: ReadingResponse): ExternalMeasurementResponse {
  return {
    id: row.id,
    meterId: row.meter_id,
    timestampUtc: row.timestamp_utc,
    timezone: row.timezone,
    timestampLocal: row.timestamp_local,
    powerKw: row.power_kw,
    energyKwhTotal: row.energy_kwh_total,
    quality: row.quality ?? 'unknown',
    source: row.source ?? 'api_ingress',
    ingestedAt: row.ingested_at ?? null,
  };
}
