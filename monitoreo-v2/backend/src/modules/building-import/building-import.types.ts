import type { SiteKind } from '../../common/constants/site-metadata';

/** Supported upload formats. */
export type BuildingImportFileFormat = 'csv' | 'xlsx';

export type BuildingImportRowStatus = 'valid' | 'error' | 'duplicate';

export type BuildingImportErrorCode =
  | 'MISSING_NAME'
  | 'MISSING_CODE'
  | 'INVALID_AREA'
  | 'INVALID_COUNTRY'
  | 'INVALID_SITE_KIND'
  | 'INVALID_TIMEZONE'
  | 'REGION_NOT_FOUND'
  | 'DUPLICATE_CODE'
  | 'DUPLICATE_CODE_IN_FILE'
  | 'DUPLICATE_EXTERNAL_SITE_ID'
  | 'DUPLICATE_EXTERNAL_SITE_ID_IN_FILE'
  | 'MISSING_REQUIRED_FIELD'
  | 'COMMIT_FAILED';

export interface ParsedBuildingImportRow {
  rowNumber: number;
  rawCells: Record<string, string>;
  name: string | null;
  code: string | null;
  address: string | null;
  areaSqm: number | null;
  regionCode: string | null;
  countryCode: string | null;
  timezone: string | null;
  externalSiteId: string | null;
  siteKind: SiteKind | null;
  status: BuildingImportRowStatus;
  errorCodes: BuildingImportErrorCode[];
  resolvedRegionId: string | null;
}

export interface BuildingImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
}

export interface BuildingImportParseResult {
  format: BuildingImportFileFormat;
  rows: ParsedBuildingImportRow[];
  summary: BuildingImportSummary;
}

export interface BuildingImportRegionRef {
  id: string;
  code: string;
  name: string;
}

export interface BuildingImportExistingRef {
  id: string;
  code: string;
  externalSiteId: string | null;
}

export interface BuildingImportTenantContext {
  tenantId: string;
  regionsByCode: Map<string, BuildingImportRegionRef>;
  existingCodes: Set<string>;
  existingExternalSiteIds: Set<string>;
}

/** Multipart upload shape from Nest FileInterceptor (memory storage). */
export interface BuildingImportUploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
}
