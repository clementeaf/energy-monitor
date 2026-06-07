import type {
  MeterImportBuildingRef,
  MeterImportErrorCode,
  MeterImportHierarchyRef,
  MeterImportMeterRef,
} from './meter-import.types';

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
  buildings: MeterImportBuildingRef[],
): { buildingId: string | null; error: MeterImportErrorCode | null } {
  const code = buildingCode?.trim() || null;
  const external = externalSiteId?.trim() || null;

  let byCode: MeterImportBuildingRef | undefined;
  let byExternal: MeterImportBuildingRef | undefined;

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
 * Detects duplicate meter code in DB or within the same file.
 * @param code - Meter code
 * @param existingCodes - Codes already in tenant
 * @param seenInFile - Codes seen earlier in this upload
 * @returns Duplicate error code or null
 */
export function detectDuplicateCode(
  code: string,
  existingCodes: Set<string>,
  seenInFile: Set<string>,
): MeterImportErrorCode | null {
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
 * Detects duplicate external id in DB or within the same file.
 * @param externalId - External meter id
 * @param existingExternalIds - External ids already in tenant
 * @param seenInFile - External ids seen earlier in this upload
 * @returns Duplicate error code or null
 */
export function detectDuplicateExternalId(
  externalId: string,
  existingExternalIds: Set<string>,
  seenInFile: Set<string>,
): MeterImportErrorCode | null {
  const key = externalId.toLowerCase();
  if (seenInFile.has(key)) {
    return 'DUPLICATE_EXTERNAL_ID_IN_FILE';
  }
  if (existingExternalIds.has(key)) {
    return 'DUPLICATE_EXTERNAL_ID';
  }
  return null;
}

/**
 * Resolves parent meter id from code within building scope.
 * @param parentCode - Parent meter code cell
 * @param ownCode - Current row meter code
 * @param buildingId - Resolved building id
 * @param metersByBuildingCode - Map "buildingId|code" → meter ref
 * @param codesInFile - Valid meter codes in same file (lowercase)
 * @returns Parent resolution result
 */
export function resolveParentMeter(
  parentCode: string | null,
  ownCode: string | null,
  buildingId: string | null,
  metersByBuildingCode: Map<string, MeterImportMeterRef>,
  codesInFile: Set<string>,
): {
  parentMeterId: string | null;
  parentPendingInFile: boolean;
  error: MeterImportErrorCode | null;
} {
  if (!parentCode?.trim()) {
    return { parentMeterId: null, parentPendingInFile: false, error: null };
  }

  const normalizedParent = parentCode.trim().toLowerCase();
  if (ownCode && normalizedParent === ownCode.trim().toLowerCase()) {
    return { parentMeterId: null, parentPendingInFile: false, error: 'INVALID_PARENT_SELF' };
  }

  if (!buildingId) {
    return { parentMeterId: null, parentPendingInFile: false, error: 'PARENT_METER_NOT_FOUND' };
  }

  const dbKey = `${buildingId}|${normalizedParent}`;
  const dbMatch = metersByBuildingCode.get(dbKey);
  if (dbMatch) {
    return { parentMeterId: dbMatch.id, parentPendingInFile: false, error: null };
  }

  if (codesInFile.has(normalizedParent)) {
    return { parentMeterId: null, parentPendingInFile: true, error: null };
  }

  return { parentMeterId: null, parentPendingInFile: false, error: 'PARENT_METER_NOT_FOUND' };
}

/**
 * Resolves hierarchy node id by name within a building.
 * @param nodeName - Hierarchy node name cell
 * @param buildingId - Resolved building id
 * @param hierarchyByBuildingName - Map "buildingId|name" → node refs
 * @returns Hierarchy node id and optional error
 */
export function resolveHierarchyNode(
  nodeName: string | null,
  buildingId: string | null,
  hierarchyByBuildingName: Map<string, MeterImportHierarchyRef[]>,
): { hierarchyNodeId: string | null; error: MeterImportErrorCode | null } {
  if (!nodeName?.trim() || !buildingId) {
    return { hierarchyNodeId: null, error: null };
  }

  const key = `${buildingId}|${nodeName.trim().toLowerCase()}`;
  const matches = hierarchyByBuildingName.get(key) ?? [];
  if (matches.length === 0) {
    return { hierarchyNodeId: null, error: 'HIERARCHY_NODE_NOT_FOUND' };
  }
  if (matches.length > 1) {
    return { hierarchyNodeId: null, error: 'HIERARCHY_NODE_AMBIGUOUS' };
  }

  return { hierarchyNodeId: matches[0].id, error: null };
}
