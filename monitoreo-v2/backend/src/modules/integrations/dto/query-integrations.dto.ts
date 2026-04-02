import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { IntegrationStatus } from '../../platform/entities/integration.entity';

const STATUSES: IntegrationStatus[] = ['active', 'inactive', 'error', 'pending'];

export class QueryIntegrationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  integrationType?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: IntegrationStatus;
}
