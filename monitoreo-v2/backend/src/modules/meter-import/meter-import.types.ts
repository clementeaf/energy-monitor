import type { LoadCategory } from '../../common/constants/site-metadata';
import type { MeterPhaseType } from '../platform/entities/meter.entity';

/** Supported upload formats. */
export type MeterImportFileFormat = 'csv' | 'xlsx';

export type MeterImportRowStatus = 'valid' | 'error' | 'duplicate';

export type MeterImportErrorCode =
  | 'MISSING_NAME'
  | 'MISSING_CODE'
  | 'MISSING_BUILDING_REF'
  | 'BUILDING_NOT_FOUND'
  | 'BUILDING_REF_MISMATCH'
  | 'INVALID_PHASE_TYPE'
  | 'INVALID_LOAD_CATEGORY'
  | 'INVALID_MODBUS_ADDRESS'
  | 'INVALID_IS_ACTIVE'
  | 'PARENT_METER_NOT_FOUND'
  | 'PARENT_METER_CROSS_BUILDING'
  | 'INVALID_PARENT_SELF'
  | 'HIERARCHY_NODE_NOT_FOUND'
  | 'HIERARCHY_NODE_AMBIGUOUS'
  | 'DUPLICATE_CODE'
  | 'DUPLICATE_CODE_IN_FILE'
  | 'DUPLICATE_EXTERNAL_ID'
  | 'DUPLICATE_EXTERNAL_ID_IN_FILE'
  | 'COMMIT_FAILED';

export interface ParsedMeterImportRow {
  rowNumber: number;
  rawCells: Record<string, string>;
  name: string | null;
  code: string | null;
  buildingCode: string | null;
  externalSiteId: string | null;
  meterType: string | null;
  model: string | null;
  serialNumber: string | null;
  phaseType: MeterPhaseType | null;
  loadCategory: LoadCategory | null;
  parentMeterCode: string | null;
  hierarchyNodeName: string | null;
  modbusAddress: number | null;
  busId: string | null;
  uplinkRoute: string | null;
  externalId: string | null;
  isActive: boolean | null;
  status: MeterImportRowStatus;
  errorCodes: MeterImportErrorCode[];
  resolvedBuildingId: string | null;
  resolvedParentMeterId: string | null;
  resolvedHierarchyNodeId: string | null;
  parentPendingInFile: boolean;
}

export interface MeterImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
}

export interface MeterImportParseResult {
  format: MeterImportFileFormat;
  rows: ParsedMeterImportRow[];
  summary: MeterImportSummary;
}

export interface MeterImportBuildingRef {
  id: string;
  code: string;
  externalSiteId: string | null;
}

export interface MeterImportMeterRef {
  id: string;
  code: string;
  buildingId: string;
}

export interface MeterImportHierarchyRef {
  id: string;
  buildingId: string;
  name: string;
}

export interface MeterImportTenantContext {
  tenantId: string;
  buildings: MeterImportBuildingRef[];
  existingCodes: Set<string>;
  existingExternalIds: Set<string>;
  metersByBuildingCode: Map<string, MeterImportMeterRef>;
  hierarchyByBuildingName: Map<string, MeterImportHierarchyRef[]>;
}

/** Multipart upload shape from Nest FileInterceptor (memory storage). */
export interface MeterImportUploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
}
