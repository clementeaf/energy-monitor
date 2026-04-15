import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { IntegrationStatus } from '../../platform/entities/integration.entity';
import { SUPPORTED_INTEGRATION_TYPES } from '../connectors/connector.interface';

const STATUSES: IntegrationStatus[] = ['active', 'inactive', 'error', 'pending'];

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsIn([...SUPPORTED_INTEGRATION_TYPES])
  integrationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: IntegrationStatus;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
