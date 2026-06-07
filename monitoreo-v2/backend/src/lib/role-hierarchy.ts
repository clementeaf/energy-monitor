/**
 * Returns whether the creator role may assign the target role by hierarchy level.
 * Lower hierarchy_level = more privilege (matches UsersService.enforceHierarchy).
 * @param creatorRoleSlug - Slug of the creating user role
 * @param creatorHierarchyLevel - Creator role hierarchy level
 * @param targetHierarchyLevel - Target role hierarchy level
 * @returns true if assignment is allowed
 */
export function canAssignRoleByHierarchy(
  creatorRoleSlug: string,
  creatorHierarchyLevel: number,
  targetHierarchyLevel: number,
): boolean {
  if (creatorRoleSlug === 'super_admin') {
    return true;
  }
  return targetHierarchyLevel > creatorHierarchyLevel;
}
