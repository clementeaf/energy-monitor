export type PlatformReportType =
  | 'executive'
  | 'consumption'
  | 'demand'
  | 'billing'
  | 'quality'
  | 'sla'
  | 'esg'
  | 'benchmark'
  | 'inventory'
  | 'alerts_compliance';

export type ReportFormat = 'pdf' | 'excel' | 'csv';

export interface Report {
  id: string;
  tenantId: string;
  buildingId: string | null;
  reportType: PlatformReportType;
  periodStart: string;
  periodEnd: string;
  format: ReportFormat;
  fileUrl: string | null;
  fileSizeBytes: string | null;
  generatedBy: string;
  createdAt: string;
}

export interface ScheduledReport {
  id: string;
  tenantId: string;
  buildingId: string | null;
  reportType: PlatformReportType;
  format: ReportFormat;
  cronExpression: string;
  recipients: string[];
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportQueryParams {
  buildingId?: string;
  reportType?: PlatformReportType;
}

export interface ScheduledReportQueryParams {
  buildingId?: string;
  isActive?: boolean;
}

export interface GenerateReportPayload {
  reportType: PlatformReportType;
  buildingId?: string | null;
  periodStart: string;
  periodEnd: string;
  format: ReportFormat;
}

export interface CreateScheduledReportPayload {
  reportType: PlatformReportType;
  buildingId?: string | null;
  format: ReportFormat;
  cronExpression: string;
  recipients: string[];
  isActive?: boolean;
}

export interface UpdateScheduledReportPayload {
  reportType?: PlatformReportType;
  buildingId?: string | null;
  format?: ReportFormat;
  cronExpression?: string;
  recipients?: string[];
  isActive?: boolean;
}
