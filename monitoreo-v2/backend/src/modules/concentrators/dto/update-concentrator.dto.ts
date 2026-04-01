import { IsString, IsOptional, IsIn, IsBoolean, IsNumber, IsObject, MaxLength, Min, Max } from 'class-validator';

export class UpdateConcentratorDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firmwareVersion?: string;

  @IsOptional()
  @IsIn(['online', 'offline', 'error', 'maintenance'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  mqttConnected?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
