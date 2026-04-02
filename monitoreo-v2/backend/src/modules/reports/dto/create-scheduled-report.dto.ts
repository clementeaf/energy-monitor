import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ArrayNotEmpty,
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

export class CreateScheduledReportDto {
  @IsIn(REPORT_TYPES)
  reportType!: PlatformReportType;

  @IsOptional()
  @IsUUID()
  buildingId?: string | null;

  @IsIn(FORMATS)
  format!: ReportFormat;

  @IsString()
  @MaxLength(100)
  cronExpression!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recipients!: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
