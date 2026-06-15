import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MeasurementMetricsDto } from './measurement-metrics.dto';

/**
 * DAT-20: Manual CNR (Consumo No Registrado) reading insertion.
 * Forces quality=estimated, source=manual_cnr. Requires reason for audit.
 */
export class CreateCnrReadingDto {
  @ApiProperty({ format: 'uuid', description: 'Target meter UUID' })
  @IsUUID('4')
  meterId!: string;

  @ApiProperty({
    example: '2026-06-10T14:00:00.000Z',
    description: 'Reading timestamp (ISO 8601, UTC)',
  })
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ type: MeasurementMetricsDto })
  @ValidateNested()
  @Type(() => MeasurementMetricsDto)
  metrics!: MeasurementMetricsDto;

  @ApiProperty({
    example: 'Falla conectividad medidor 3 días, estimación por consumo histórico promedio',
    description: 'CNR justification (required for audit trail)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
