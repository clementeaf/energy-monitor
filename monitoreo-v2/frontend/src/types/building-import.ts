export type BuildingImportJobStatus =
  | 'pending_parse'
  | 'ready'
  | 'committing'
  | 'committed'
  | 'failed'
  | 'cancelled';

export type BuildingImportRowStatus = 'valid' | 'error' | 'duplicate' | 'created' | 'pending' | 'skipped';

export interface BuildingImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
}

export interface BuildingImportJob {
  id: string;
  tenantId: string;
  originalFilename: string;
  fileFormat: string;
  status: BuildingImportJobStatus;
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

export interface BuildingImportStagingRow {
  id: string;
  rowNumber: number;
  name: string | null;
  code: string | null;
  address: string | null;
  areaSqm: number | null;
  regionCode: string | null;
  countryCode: string | null;
  timezone: string | null;
  externalSiteId: string | null;
  siteKind: string | null;
  status: BuildingImportRowStatus;
  errorCodes: string[];
  resolvedRegionId: string | null;
  createdBuildingId: string | null;
}

export interface ValidateBuildingImportResponse {
  jobId: string;
  summary: BuildingImportSummary;
}

export interface BuildingImportJobDetailResponse {
  job: BuildingImportJob;
  summary: BuildingImportSummary;
}

export interface BuildingImportRowsResponse {
  data: BuildingImportStagingRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface BuildingImportJobsListResponse {
  data: BuildingImportJob[];
  total: number;
}

export interface CommitBuildingImportResponse {
  jobId: string;
  created: number;
  skipped: number;
  failed: number;
}

export interface BuildingImportRowsQueryParams {
  limit?: number;
  offset?: number;
  status?: 'valid' | 'error' | 'duplicate' | 'created';
}
