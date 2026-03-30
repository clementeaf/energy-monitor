import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  IsIn,
  MaxLength,
  Min,
  IsIP,
} from 'class-validator';
import type { MeterPhaseType } from '../../platform/entities/meter.entity';

export class CreateMeterDto {
  @IsString()
  buildingId!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(100)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  meterType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  modbusAddress?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  busId?: string;

  @IsOptional()
  @IsIn(['single_phase', 'three_phase'])
  phaseType?: MeterPhaseType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  uplinkRoute?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nominalVoltage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nominalCurrent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  contractedDemandKw?: number;
}
