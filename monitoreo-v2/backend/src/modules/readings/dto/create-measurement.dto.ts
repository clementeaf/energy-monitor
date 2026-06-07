import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { READING_QUALITIES } from '../../../common/constants/reading-quality';
import type { ReadingQuality } from '../../../common/constants/reading-quality';
import { MeasurementMetricsDto } from './measurement-metrics.dto';

/**
 * Payload for POST /v1/measurements (external API ingress).
 */
export class CreateMeasurementDto {
  @ApiProperty({ format: 'uuid', description: 'Target meter UUID' })
  @IsUUID('4')
  meterId!: string;

  @ApiProperty({
    example: '2026-06-06T12:00:00.000Z',
    description: 'Event timestamp (ISO 8601, UTC recommended)',
  })
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ type: MeasurementMetricsDto })
  @ValidateNested()
  @Type(() => MeasurementMetricsDto)
  metrics!: MeasurementMetricsDto;

  @ApiPropertyOptional({
    enum: READING_QUALITIES,
    default: 'measured',
    description: 'Data quality flag',
  })
  @IsOptional()
  @IsIn(READING_QUALITIES)
  quality?: ReadingQuality;

  @ApiPropertyOptional({
    example: 'erp-batch-20260606-001',
    description: 'Integrator reference (logged only; dedupe uses meterId+timestamp+source)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalRef?: string;
}
