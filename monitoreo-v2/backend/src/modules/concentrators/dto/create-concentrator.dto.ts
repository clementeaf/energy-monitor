import { IsString, IsOptional, IsUUID, IsIn, IsObject, MaxLength } from 'class-validator';

export class CreateConcentratorDto {
  @IsUUID()
  buildingId!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(100)
  model!: string;

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
  @IsObject()
  metadata?: Record<string, unknown>;
}
