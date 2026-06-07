export type TenantUnitImportJobStatus =
  | 'pending_parse'
  | 'ready'
  | 'committing'
  | 'committed'
  | 'failed'
  | 'cancelled';

export type TenantUnitImportRowStatus = 'valid' | 'error' | 'duplicate' | 'created' | 'pending' | 'skipped';

export interface TenantUnitImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
}

export interface TenantUnitImportJob {
  id: string;
  tenantId: string;
  originalFilename: string;
  fileFormat: string;
  status: TenantUnitImportJobStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  createdRows: number;
  errorSummary: string | null;
  committedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUnitImportStagingRow {
  id: string;
  rowNumber: number;
  name: string | null;
  unitCode: string | null;
  buildingCode: string | null;
  externalSiteId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  externalUnitId: string | null;
  status: TenantUnitImportRowStatus;
  errorCodes: string[];
  resolvedBuildingId: string | null;
  createdTenantUnitId: string | null;
}

export interface ValidateTenantUnitImportResponse {
  jobId: string;
  summary: TenantUnitImportSummary;
}

export interface TenantUnitImportJobDetailResponse {
  job: TenantUnitImportJob;
  summary: TenantUnitImportSummary;
}

export interface TenantUnitImportRowsResponse {
  data: TenantUnitImportStagingRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface TenantUnitImportJobsListResponse {
  data: TenantUnitImportJob[];
  total: number;
}

export interface CommitTenantUnitImportResponse {
  jobId: string;
  created: number;
  skipped: number;
  failed: number;
}

export interface TenantUnitImportRowsQueryParams {
  limit?: number;
  offset?: number;
  status?: 'valid' | 'error' | 'duplicate' | 'created';
}
