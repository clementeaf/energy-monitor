import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Electrical metrics payload for a single measurement ingress point.
 */
export class MeasurementMetricsDto {
  @ApiProperty({ example: 12.5, description: 'Active power in kW' })
  @IsNumber()
  powerKw!: number;

  @ApiProperty({ example: 10450.25, description: 'Cumulative energy in kWh' })
  @IsNumber()
  energyKwhTotal!: number;

  @ApiPropertyOptional({ example: 220.1 })
  @IsOptional()
  @IsNumber()
  voltageL1?: number;

  @ApiPropertyOptional({ example: 219.8 })
  @IsOptional()
  @IsNumber()
  voltageL2?: number;

  @ApiPropertyOptional({ example: 220.4 })
  @IsOptional()
  @IsNumber()
  voltageL3?: number;

  @ApiPropertyOptional({ example: 18.2 })
  @IsOptional()
  @IsNumber()
  currentL1?: number;

  @ApiPropertyOptional({ example: 17.9 })
  @IsOptional()
  @IsNumber()
  currentL2?: number;

  @ApiPropertyOptional({ example: 18.5 })
  @IsOptional()
  @IsNumber()
  currentL3?: number;

  @ApiPropertyOptional({ example: 2.1 })
  @IsOptional()
  @IsNumber()
  reactivePowerKvar?: number;

  @ApiPropertyOptional({ example: 0.95 })
  @IsOptional()
  @IsNumber()
  powerFactor?: number;

  @ApiPropertyOptional({ example: 50.01 })
  @IsOptional()
  @IsNumber()
  frequencyHz?: number;

  @ApiPropertyOptional({ example: 1.8 })
  @IsOptional()
  @IsNumber()
  thdVoltagePct?: number;

  @ApiPropertyOptional({ example: 4.2 })
  @IsOptional()
  @IsNumber()
  thdCurrentPct?: number;

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  phaseImbalancePct?: number;
}
