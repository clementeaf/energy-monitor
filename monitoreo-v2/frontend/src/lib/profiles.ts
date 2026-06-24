import type { RoleSlug } from '../types/auth';

/**
 * User profiles from the EMS spec (docs/roles-ems.md).
 * Each profile defines a distinct sidebar navigation and feature scope.
 */
export type UserProfile =
  | 'gerencial'
  | 'operacional'
  | 'tecnico'
  | 'auditor'
  | 'super_admin'
  | 'locatario';

/**
 * Maps every RoleSlug to its corresponding UserProfile.
 * Source of truth for role→profile resolution — no if/else chains.
 */
export const ROLE_TO_PROFILE: Record<RoleSlug, UserProfile> = {
  super_admin: 'super_admin',
  corp_admin: 'gerencial',
  site_admin: 'operacional',
  operator: 'tecnico',
  tenant_user: 'locatario',
  analyst: 'gerencial',
  auditor: 'auditor',
};

/** All valid profiles (for iteration / exhaustiveness checks). */
export const ALL_PROFILES: readonly UserProfile[] = [
  'gerencial',
  'operacional',
  'tecnico',
  'auditor',
  'super_admin',
  'locatario',
] as const;

/** Human-readable labels for each profile (Spanish UI). */
export const PROFILE_LABELS: Record<UserProfile, string> = {
  gerencial: 'Gerencial',
  operacional: 'Operacional',
  tecnico: 'Técnico',
  auditor: 'Auditor',
  super_admin: 'Súper Administrador',
  locatario: 'Locatario',
};

/**
 * Resolves a role slug to its profile.
 * Returns 'locatario' as fallback for unknown slugs (most restrictive).
 */
export function resolveProfile(roleSlug: RoleSlug | null): UserProfile {
  return (roleSlug && ROLE_TO_PROFILE[roleSlug]) ?? 'locatario';
}
