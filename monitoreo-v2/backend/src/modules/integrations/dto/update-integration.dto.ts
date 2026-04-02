import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { IntegrationStatus } from '../../platform/entities/integration.entity';

const STATUSES: IntegrationStatus[] = ['active', 'inactive', 'error', 'pending'];

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  integrationType?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: IntegrationStatus;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
