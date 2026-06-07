/** Supported upload formats. */
export type UserImportFileFormat = 'csv' | 'xlsx';

export type UserImportAuthProvider = 'microsoft' | 'google';

export type UserImportRowStatus = 'valid' | 'error' | 'duplicate';

export type UserImportErrorCode =
  | 'INVALID_EMAIL'
  | 'INVALID_PROVIDER'
  | 'MISSING_ROLE'
  | 'INVALID_PHONE'
  | 'ROLE_NOT_FOUND'
  | 'BUILDING_NOT_FOUND'
  | 'HIERARCHY_DENIED'
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_EMAIL_IN_FILE'
  | 'MISSING_REQUIRED_FIELD';

export interface ParsedUserImportRow {
  rowNumber: number;
  rawCells: Record<string, string>;
  email: string | null;
  displayName: string | null;
  authProvider: UserImportAuthProvider | null;
  roleSlug: string | null;
  buildingCodes: string[];
  buildingCodesRaw: string | null;
  phone: string | null;
  status: UserImportRowStatus;
  errorCodes: UserImportErrorCode[];
  resolvedRoleId: string | null;
  resolvedBuildingIds: string[];
}

export interface UserImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
}

export interface UserImportParseResult {
  format: UserImportFileFormat;
  rows: ParsedUserImportRow[];
  summary: UserImportSummary;
}

export interface UserImportRoleRef {
  id: string;
  slug: string;
  name: string;
  hierarchyLevel: number;
}

export interface UserImportBuildingRef {
  id: string;
  code: string;
  name: string;
  externalSiteId: string | null;
}

export interface UserImportTenantContext {
  tenantId: string;
  creatorRoleId: string;
  creatorRoleSlug: string;
  creatorHierarchyLevel: number;
  rolesBySlug: Map<string, UserImportRoleRef>;
  buildings: UserImportBuildingRef[];
  existingEmails: Set<string>;
}

/** Multipart upload shape from Nest FileInterceptor (memory storage). */
export interface UserImportUploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
}
