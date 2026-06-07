import { canAssignRoleByHierarchy } from '../../lib/role-hierarchy';
import {
  resolveBuildingCodes,
  resolveRoleSlug,
  detectDuplicateEmail,
  validateRoleHierarchy,
} from './user-import.resolver';
import type { UserImportBuildingRef, UserImportRoleRef, UserImportTenantContext } from './user-import.types';

describe('user-import.resolver', () => {
  const roles = new Map<string, UserImportRoleRef>([
    ['operator', { id: 'role-op', slug: 'operator', name: 'Operator', hierarchyLevel: 50 }],
    ['super_admin', { id: 'role-sa', slug: 'super_admin', name: 'Super Admin', hierarchyLevel: 0 }],
  ]);

  const buildings: UserImportBuildingRef[] = [
    { id: 'b-1', code: 'MM446', name: 'Mall del Mar', externalSiteId: 'EXT-446' },
    { id: 'b-2', code: 'MG254', name: 'Mallplaza Gestion', externalSiteId: null },
  ];

  it('resolves role slug tenant-scoped', () => {
    const hit = resolveRoleSlug('operator', roles);
    expect(hit.role?.id).toBe('role-op');
    expect(hit.error).toBeNull();

    const miss = resolveRoleSlug('unknown', roles);
    expect(miss.error).toBe('ROLE_NOT_FOUND');
  });

  it('resolves buildings by code, external id, then name', () => {
    expect(resolveBuildingCodes(['MM446'], buildings).buildingIds).toEqual(['b-1']);
    expect(resolveBuildingCodes(['EXT-446'], buildings).buildingIds).toEqual(['b-1']);
    expect(resolveBuildingCodes(['mall del mar'], buildings).buildingIds).toEqual(['b-1']);
    expect(resolveBuildingCodes(['NOPE'], buildings).error).toBe('BUILDING_NOT_FOUND');
  });

  it('detects duplicate emails in file and tenant', () => {
    const seen = new Set<string>();
    const existing = new Set(['old@empresa.cl']);

    expect(detectDuplicateEmail('new@empresa.cl', existing, seen)).toBeNull();
    seen.add('new@empresa.cl');
    expect(detectDuplicateEmail('new@empresa.cl', existing, seen)).toBe('DUPLICATE_EMAIL_IN_FILE');
    expect(detectDuplicateEmail('old@empresa.cl', existing, new Set())).toBe('DUPLICATE_EMAIL');
  });

  it('enforces role hierarchy for non super_admin creators', () => {
    expect(canAssignRoleByHierarchy('operator', 50, 40)).toBe(false);
    expect(canAssignRoleByHierarchy('operator', 50, 60)).toBe(true);
    expect(canAssignRoleByHierarchy('super_admin', 0, 0)).toBe(true);
  });

  it('denies operator assigning super_admin via context hierarchy check', () => {
    const context: UserImportTenantContext = {
      tenantId: 't-1',
      creatorRoleId: 'r-op',
      creatorRoleSlug: 'operator',
      creatorHierarchyLevel: 50,
      rolesBySlug: roles,
      buildings,
      existingEmails: new Set(),
    };
    const target = roles.get('super_admin');
    expect(target).toBeDefined();
    expect(validateRoleHierarchy(context, target!)).toBe('HIERARCHY_DENIED');
  });
});
