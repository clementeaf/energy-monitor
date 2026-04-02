import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { PlatformReportType, ReportFormat } from '../../platform/entities/report.entity';

const REPORT_TYPES: PlatformReportType[] = [
  'executive',
  'consumption',
  'demand',
  'billing',
  'quality',
  'sla',
  'esg',
  'benchmark',
  'inventory',
  'alerts_compliance',
];

const FORMATS: ReportFormat[] = ['pdf', 'excel', 'csv'];

export class UpdateScheduledReportDto {
  @IsOptional()
  @IsIn(REPORT_TYPES)
  reportType?: PlatformReportType;

  @IsOptional()
  @IsUUID()
  buildingId?: string | null;

  @IsOptional()
  @IsIn(FORMATS)
  format?: ReportFormat;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cronExpression?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
