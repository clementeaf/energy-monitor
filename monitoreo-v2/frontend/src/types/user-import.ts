export type UserImportJobStatus =
  | 'pending_parse'
  | 'ready'
  | 'committing'
  | 'committed'
  | 'failed'
  | 'cancelled';

export type UserImportRowStatus = 'valid' | 'error' | 'duplicate' | 'created' | 'pending' | 'skipped';

export interface UserImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
}

export interface UserImportJob {
  id: string;
  tenantId: string;
  originalFilename: string;
  fileFormat: string;
  status: UserImportJobStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  createdRows: number;
  ageVerifiedAtCommit: boolean;
  errorSummary: string | null;
  committedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserImportStagingRow {
  id: string;
  rowNumber: number;
  email: string | null;
  displayName: string | null;
  authProvider: string | null;
  roleSlug: string | null;
  buildingCodesRaw: string | null;
  phone: string | null;
  status: UserImportRowStatus;
  errorCodes: string[];
  resolvedRoleId: string | null;
  resolvedBuildingIds: string[];
  createdUserId: string | null;
}

export interface ValidateUserImportResponse {
  jobId: string;
  summary: UserImportSummary;
}

export interface UserImportJobDetailResponse {
  job: UserImportJob;
  summary: UserImportSummary;
}

export interface UserImportRowsResponse {
  data: UserImportStagingRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserImportJobsListResponse {
  data: UserImportJob[];
  total: number;
}

export interface CommitUserImportPayload {
  ageVerified: boolean;
}

export interface CommitUserImportResponse {
  jobId: string;
  created: number;
  skipped: number;
  failed: number;
}

export interface UserImportRowsQueryParams {
  limit?: number;
  offset?: number;
  status?: 'valid' | 'error' | 'duplicate' | 'created';
}
