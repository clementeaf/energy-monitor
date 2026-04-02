import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
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

export class GenerateReportDto {
  @IsIn(REPORT_TYPES)
  reportType!: PlatformReportType;

  @IsOptional()
  @IsUUID()
  buildingId?: string | null;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsIn(FORMATS)
  format!: ReportFormat;
}
