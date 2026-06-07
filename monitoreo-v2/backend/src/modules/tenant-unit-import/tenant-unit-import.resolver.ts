import type {
  TenantUnitImportBuildingRef,
  TenantUnitImportErrorCode,
} from './tenant-unit-import.types';

/**
 * Resolves building id from code and/or external site id.
 * @param buildingCode - Building code cell
 * @param externalSiteId - External site id cell
 * @param buildings - Tenant buildings catalog
 * @returns Building id and optional error
 */
export function resolveBuildingRef(
  buildingCode: string | null,
  externalSiteId: string | null,
  buildings: TenantUnitImportBuildingRef[],
): { buildingId: string | null; error: TenantUnitImportErrorCode | null } {
  const code = buildingCode?.trim() || null;
  const external = externalSiteId?.trim() || null;

  let byCode: TenantUnitImportBuildingRef | undefined;
  let byExternal: TenantUnitImportBuildingRef | undefined;

  if (code) {
    byCode = buildings.find((b) => b.code.toLowerCase() === code.toLowerCase());
  }
  if (external) {
    byExternal = buildings.find(
      (b) => b.externalSiteId?.toLowerCase() === external.toLowerCase(),
    );
  }

  if (code && external && byCode && byExternal && byCode.id !== byExternal.id) {
    return { buildingId: null, error: 'BUILDING_REF_MISMATCH' };
  }

  const match = byCode ?? byExternal;
  if (!match) {
    return { buildingId: null, error: 'BUILDING_NOT_FOUND' };
  }

  return { buildingId: match.id, error: null };
}

/**
 * Detects duplicate unit code per building in DB or within the same file.
 * @param buildingId - Resolved building UUID
 * @param unitCode - Unit code
 * @param existingUnitKeys - Keys "buildingId|unitCode" in tenant
 * @param seenInFile - Keys seen earlier in this upload
 * @returns Duplicate error code or null
 */
export function detectDuplicateUnitCode(
  buildingId: string,
  unitCode: string,
  existingUnitKeys: Set<string>,
  seenInFile: Set<string>,
): TenantUnitImportErrorCode | null {
  const key = `${buildingId}|${unitCode.toLowerCase()}`;
  if (seenInFile.has(key)) {
    return 'DUPLICATE_UNIT_CODE_IN_FILE';
  }
  if (existingUnitKeys.has(key)) {
    return 'DUPLICATE_UNIT_CODE';
  }
  return null;
}
