export type MeterImportJobStatus =
  | 'pending_parse'
  | 'ready'
  | 'committing'
  | 'committed'
  | 'failed'
  | 'cancelled';

export type MeterImportRowStatus = 'valid' | 'error' | 'duplicate' | 'created' | 'pending' | 'skipped';

export interface MeterImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
}

export interface MeterImportJob {
  id: string;
  tenantId: string;
  originalFilename: string;
  fileFormat: string;
  status: MeterImportJobStatus;
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

export interface MeterImportStagingRow {
  id: string;
  rowNumber: number;
  name: string | null;
  code: string | null;
  buildingCode: string | null;
  externalSiteId: string | null;
  meterType: string | null;
  model: string | null;
  phaseType: string | null;
  loadCategory: string | null;
  parentMeterCode: string | null;
  hierarchyNodeName: string | null;
  status: MeterImportRowStatus;
  errorCodes: string[];
  resolvedBuildingId: string | null;
  resolvedParentMeterId: string | null;
  resolvedHierarchyNodeId: string | null;
  createdMeterId: string | null;
}

export interface ValidateMeterImportResponse {
  jobId: string;
  summary: MeterImportSummary;
}

export interface MeterImportJobDetailResponse {
  job: MeterImportJob;
  summary: MeterImportSummary;
}

export interface MeterImportRowsResponse {
  data: MeterImportStagingRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface MeterImportJobsListResponse {
  data: MeterImportJob[];
  total: number;
}

export interface CommitMeterImportResponse {
  jobId: string;
  created: number;
  skipped: number;
  failed: number;
}

export interface MeterImportRowsQueryParams {
  limit?: number;
  offset?: number;
  status?: 'valid' | 'error' | 'duplicate' | 'created';
}
