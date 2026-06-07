import { canAssignRoleByHierarchy } from '../../lib/role-hierarchy';
import type {
  UserImportBuildingRef,
  UserImportErrorCode,
  UserImportRoleRef,
  UserImportTenantContext,
} from './user-import.types';

/**
 * Resolves role slug to tenant role metadata.
 * @param roleSlug - Role slug from import row
 * @param rolesBySlug - Tenant roles indexed by slug
 * @returns Role ref and optional error code
 */
export function resolveRoleSlug(
  roleSlug: string,
  rolesBySlug: Map<string, UserImportRoleRef>,
): { role: UserImportRoleRef | null; error: UserImportErrorCode | null } {
  const slug = roleSlug.trim().toLowerCase();
  const role = rolesBySlug.get(slug) ?? null;
  if (!role) {
    return { role: null, error: 'ROLE_NOT_FOUND' };
  }
  return { role, error: null };
}

/**
 * Resolves building reference tokens to building UUIDs for the tenant.
 * @param codes - Building codes/names from import row
 * @param buildings - Tenant buildings catalog
 * @returns Resolved IDs and optional error with missing tokens
 */
export function resolveBuildingCodes(
  codes: string[],
  buildings: UserImportBuildingRef[],
): { buildingIds: string[]; error: UserImportErrorCode | null; missing: string[] } {
  if (codes.length === 0) {
    return { buildingIds: [], error: null, missing: [] };
  }

  const byCode = new Map<string, string>();
  const byExternal = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const building of buildings) {
    byCode.set(building.code.toLowerCase(), building.id);
    if (building.externalSiteId) {
      byExternal.set(building.externalSiteId.toLowerCase(), building.id);
    }
    byName.set(building.name.trim().toLowerCase(), building.id);
  }

  const buildingIds: string[] = [];
  const missing: string[] = [];
  const seenIds = new Set<string>();

  for (const token of codes) {
    const key = token.toLowerCase();
    const id =
      byCode.get(key) ??
      byExternal.get(key) ??
      byName.get(key) ??
      null;

    if (!id) {
      missing.push(token);
      continue;
    }
    if (!seenIds.has(id)) {
      seenIds.add(id);
      buildingIds.push(id);
    }
  }

  if (missing.length > 0) {
    return { buildingIds: [], error: 'BUILDING_NOT_FOUND', missing };
  }

  return { buildingIds, error: null, missing: [] };
}

/**
 * Checks whether creator may assign the resolved target role.
 * @param context - Import tenant context
 * @param targetRole - Resolved target role
 * @returns Error code or null
 */
export function validateRoleHierarchy(
  context: UserImportTenantContext,
  targetRole: UserImportRoleRef,
): UserImportErrorCode | null {
  const allowed = canAssignRoleByHierarchy(
    context.creatorRoleSlug,
    context.creatorHierarchyLevel,
    targetRole.hierarchyLevel,
  );
  return allowed ? null : 'HIERARCHY_DENIED';
}

/**
 * Checks duplicate email against tenant users and in-file set.
 * @param email - Normalized email
 * @param existingEmails - Emails already in tenant
 * @param seenInFile - Emails seen earlier in same file
 * @returns Error code or null
 */
export function detectDuplicateEmail(
  email: string,
  existingEmails: Set<string>,
  seenInFile: Set<string>,
): UserImportErrorCode | null {
  if (seenInFile.has(email)) {
    return 'DUPLICATE_EMAIL_IN_FILE';
  }
  if (existingEmails.has(email)) {
    return 'DUPLICATE_EMAIL';
  }
  return null;
}
