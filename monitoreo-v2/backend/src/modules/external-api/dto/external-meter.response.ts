import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Meter } from '../../platform/entities/meter.entity';

export class ExternalMeterResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  buildingId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  meterType!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  externalId!: string | null;

  @ApiPropertyOptional()
  model!: string | null;

  @ApiPropertyOptional()
  serialNumber!: string | null;
}

/**
 * Maps a Meter entity to the external API v1 response shape.
 * @param meter - Internal meter entity
 * @returns Camel-case DTO for third-party consumers
 */
export function toExternalMeter(meter: Meter): ExternalMeterResponse {
  return {
    id: meter.id,
    buildingId: meter.buildingId,
    name: meter.name,
    code: meter.code,
    meterType: meter.meterType,
    isActive: meter.isActive,
    externalId: meter.externalId,
    model: meter.model,
    serialNumber: meter.serialNumber,
  };
}
