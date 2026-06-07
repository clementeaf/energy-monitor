export type TenantUnitImportRowStatus = 'valid' | 'error' | 'duplicate';

export interface ParsedTenantUnitImportRow {
  rowNumber: number;
  rawCells: Record<string, string>;
  name: string | null;
  unitCode: string | null;
  buildingCode: string | null;
  externalSiteId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  externalUnitId: string | null;
  status: TenantUnitImportRowStatus;
  errorCodes: TenantUnitImportErrorCode[];
  resolvedBuildingId: string | null;
}

/** Supported upload formats. */
export type TenantUnitImportFileFormat = 'csv' | 'xlsx';

export type TenantUnitImportErrorCode =
  | 'MISSING_NAME'
  | 'MISSING_UNIT_CODE'
  | 'MISSING_BUILDING_REF'
  | 'BUILDING_NOT_FOUND'
  | 'BUILDING_REF_MISMATCH'
  | 'INVALID_EMAIL'
  | 'DUPLICATE_UNIT_CODE'
  | 'DUPLICATE_UNIT_CODE_IN_FILE'
  | 'MISSING_REQUIRED_FIELD'
  | 'COMMIT_FAILED';

export interface TenantUnitImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
}

export interface TenantUnitImportParseResult {
  format: TenantUnitImportFileFormat;
  rows: ParsedTenantUnitImportRow[];
  summary: TenantUnitImportSummary;
}

export interface TenantUnitImportBuildingRef {
  id: string;
  code: string;
  externalSiteId: string | null;
}

export interface TenantUnitImportExistingRef {
  buildingId: string;
  unitCode: string;
}

export interface TenantUnitImportTenantContext {
  tenantId: string;
  buildings: TenantUnitImportBuildingRef[];
  existingUnitKeys: Set<string>;
}

/** Multipart upload shape from Nest FileInterceptor (memory storage). */
export interface TenantUnitImportUploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
}
