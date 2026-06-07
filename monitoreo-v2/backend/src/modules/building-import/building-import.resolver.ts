import type { BuildingImportErrorCode, BuildingImportRegionRef } from './building-import.types';

/**
 * Detects duplicate building code in DB or within the same file.
 * @param code - Normalized building code
 * @param existingCodes - Codes already in tenant
 * @param seenInFile - Codes seen earlier in this upload
 * @returns Duplicate error code or null
 */
export function detectDuplicateCode(
  code: string,
  existingCodes: Set<string>,
  seenInFile: Set<string>,
): BuildingImportErrorCode | null {
  const key = code.toLowerCase();
  if (seenInFile.has(key)) {
    return 'DUPLICATE_CODE_IN_FILE';
  }
  if (existingCodes.has(key)) {
    return 'DUPLICATE_CODE';
  }
  return null;
}

/**
 * Detects duplicate external site id in DB or within the same file.
 * @param externalSiteId - External site identifier
 * @param existingIds - External ids already in tenant
 * @param seenInFile - External ids seen earlier in this upload
 * @returns Duplicate error code or null
 */
export function detectDuplicateExternalSiteId(
  externalSiteId: string,
  existingIds: Set<string>,
  seenInFile: Set<string>,
): BuildingImportErrorCode | null {
  const key = externalSiteId.toLowerCase();
  if (seenInFile.has(key)) {
    return 'DUPLICATE_EXTERNAL_SITE_ID_IN_FILE';
  }
  if (existingIds.has(key)) {
    return 'DUPLICATE_EXTERNAL_SITE_ID';
  }
  return null;
}

/**
 * Resolves region code to region id within tenant.
 * @param regionCode - Region code cell
 * @param regionsByCode - Tenant regions indexed by lowercase code
 * @returns Region id and optional error
 */
export function resolveRegionCode(
  regionCode: string | null,
  regionsByCode: Map<string, BuildingImportRegionRef>,
): { regionId: string | null; error: BuildingImportErrorCode | null } {
  if (!regionCode?.trim()) {
    return { regionId: null, error: null };
  }
  const region = regionsByCode.get(regionCode.trim().toLowerCase());
  if (!region) {
    return { regionId: null, error: 'REGION_NOT_FOUND' };
  }
  return { regionId: region.id, error: null };
}
