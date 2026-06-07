import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { MeterStatusResponse } from '../../ingest/meter-reading-status.service';

export class ExternalMeterStatusResponse {
  @ApiProperty({ format: 'uuid' })
  meterId!: string;

  @ApiPropertyOptional({ description: 'Event timestamp of last reading (UTC ISO8601)' })
  lastReadingAt!: string | null;

  @ApiPropertyOptional({ description: 'Wall-clock ingest time of last reading (UTC ISO8601)' })
  lastIngestedAt!: string | null;

  @ApiPropertyOptional({ example: 'modbus' })
  lastSource!: string | null;

  @ApiPropertyOptional({ description: 'Seconds since last reading; null if never received' })
  lagSeconds!: number | null;

  @ApiProperty({ description: 'True when lag exceeds tenant staleThresholdHours' })
  isStale!: boolean;

  @ApiProperty({ example: 4 })
  staleThresholdHours!: number;
}

/**
 * Maps internal meter status to external API v1 response.
 */
export function toExternalMeterStatus(status: MeterStatusResponse): ExternalMeterStatusResponse {
  return { ...status };
}
