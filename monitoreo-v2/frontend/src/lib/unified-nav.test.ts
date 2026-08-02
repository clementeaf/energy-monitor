import { describe, it, expect } from 'vitest';
import { UNIFIED_NAV, getVisibleNav, type UnifiedNavEntry } from './unified-nav';

/** Permission sets per role — mirrors usePermissions.ts ROLE_PERMISSIONS */
const ROLE_PERMS: Record<string, Set<string>> = {
  super_admin: new Set(['*']),
  corp_admin: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'admin_buildings:read', 'admin_meters:read',
    'alerts:read', 'billing:read', 'reports:read', 'reports:view_own',
    'integrations:read',
  ]),
  site_admin: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'admin_buildings:read', 'admin_meters:read',
    'alerts:read', 'alerts:update',
    'billing:read', 'billing:update',
    'admin_users:read', 'admin_tenants_units:read',
    'admin_hierarchy:read', 'reports:read',
    'data_quality:read', 'readings:read',
    'diagnostics:read', 'monitoring_faults:read',
  ]),
  operator: new Set([
    'dashboard_technical:read', 'readings:read',
    'diagnostics:read', 'admin_meters:read',
    'alerts:read', 'alerts:update',
    'monitoring_faults:read',
  ]),
  auditor: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'audit:read', 'reports:read',
    'admin_buildings:read', 'admin_meters:read',
  ]),
};

function makeHasAny(role: string): (...perms: string[]) => boolean {
  const set = ROLE_PERMS[role] ?? new Set();
  return (...perms) => set.has('*') || perms.some((p) => set.has(p));
}

function allEntries(): UnifiedNavEntry[] {
  return UNIFIED_NAV.flatMap((g) => g.entries);
}

describe('unified-nav', () => {
  describe('UNIFIED_NAV structure', () => {
    it('has 7 groups', () => {
      expect(UNIFIED_NAV).toHaveLength(7);
    });

    it('groups are named correctly', () => {
      const labels = UNIFIED_NAV.map((g) => g.label);
      expect(labels).toEqual([
        'Visión General',
        'Operaciones',
        'Técnico',
        'Facturación',
        'Analítica',
        'Auditoría',
        'Administración',
      ]);
    });

    it('every entry has icon, basePath, to, and requiredPerms', () => {
      allEntries().forEach((entry) => {
        expect(entry.icon).toBeTruthy();
        expect(entry.basePath).toMatch(/^\//);
        expect(entry.to).toMatch(/^\//);
        expect(entry.requiredPerms.length).toBeGreaterThan(0);
      });
    });

    it('no duplicate basePaths across all entries', () => {
      const basePaths = allEntries().map((e) => e.basePath);
      expect(new Set(basePaths).size).toBe(basePaths.length);
    });

    it('total entries = 39 (43 minus 4 merged: alerts + calidad + exportar + cnr)', () => {
      expect(allEntries().length).toBe(39);
    });
  });

  describe('new tenant-scoped entries exist', () => {
    it('Dashboard Ejecutivo in Visión General', () => {
      const group = UNIFIED_NAV.find((g) => g.label === 'Visión General')!;
      const entry = group.entries.find((e) => e.basePath === '/dashboard/executive');
      expect(entry).toBeDefined();
      expect(entry?.requiredPerms).toEqual(['dashboard_executive:read']);
    });

    it('Facturación group has 4 entries', () => {
      const group = UNIFIED_NAV.find((g) => g.label === 'Facturación')!;
      expect(group.entries).toHaveLength(4);
    });

    it('Facturas requires billing:read or billing:view_own', () => {
      const entry = allEntries().find((e) => e.basePath === '/billing');
      expect(entry?.requiredPerms).toEqual(['billing:read', 'billing:view_own']);
    });

    it('Aprobación requires billing:update', () => {
      const entry = allEntries().find((e) => e.basePath === '/billing/approve');
      expect(entry?.requiredPerms).toEqual(['billing:update']);
    });

    it('Tarifas requires billing:read', () => {
      const entry = allEntries().find((e) => e.basePath === '/billing/rates');
      expect(entry?.requiredPerms).toEqual(['billing:read']);
    });

    it('Analítica group has 3 entries', () => {
      const group = UNIFIED_NAV.find((g) => g.label === 'Analítica')!;
      expect(group.entries).toHaveLength(3);
    });

    it('Benchmark requires dashboard_executive:read', () => {
      const entry = allEntries().find((e) => e.basePath === '/analytics/benchmark');
      expect(entry?.requiredPerms).toEqual(['dashboard_executive:read']);
    });
  });

  describe('requiredPerms match router.tsx permissions', () => {
    it('Panel Consolidado requires dashboard_executive:read', () => {
      const entry = allEntries().find((e) => e.basePath === '/dashboard/consolidado');
      expect(entry?.requiredPerms).toEqual(['dashboard_executive:read']);
    });

    it('Monitoreo en Vivo requires MONITORING perms', () => {
      const entry = allEntries().find((e) => e.basePath === '/operacional/monitoreo');
      expect(entry?.requiredPerms).toEqual(['dashboard_technical:read', 'dashboard_executive:read', 'readings:read']);
    });

    it('Calidad de Datos requires data_quality:read or audit:read', () => {
      const entry = allEntries().find((e) => e.basePath === '/operacional/calidad');
      expect(entry?.requiredPerms).toEqual(['data_quality:read', 'audit:read']);
    });

    it('Usuarios y Roles requires admin_users:read', () => {
      const entry = allEntries().find((e) => e.basePath === '/admin/users');
      expect(entry?.requiredPerms).toEqual(['admin_users:read']);
    });
  });

  describe('getVisibleNav', () => {
    it('super_admin sees all 39 items (bypass)', () => {
      const visible = getVisibleNav(makeHasAny('super_admin'), false);
      const count = visible.flatMap((g) => g.entries).length;
      expect(count).toBe(39);
    });

    it('super_admin with tenant hides platformOnly items', () => {
      const visible = getVisibleNav(makeHasAny('super_admin'), true);
      const all = visible.flatMap((g) => g.entries);
      expect(all.some((e) => e.platformOnly)).toBe(false);
    });

    it('corp_admin sees Visión General, Facturación, Analítica groups', () => {
      const visible = getVisibleNav(makeHasAny('corp_admin'), false);
      const groupLabels = visible.map((g) => g.label);
      expect(groupLabels).toContain('Visión General');
      expect(groupLabels).toContain('Facturación');
      expect(groupLabels).toContain('Analítica');
      expect(groupLabels).not.toContain('Auditoría');
    });

    it('corp_admin sees Panel Consolidado', () => {
      const visible = getVisibleNav(makeHasAny('corp_admin'), false);
      const all = visible.flatMap((g) => g.entries);
      expect(all.some((e) => e.basePath === '/dashboard/consolidado')).toBe(true);
    });

    it('site_admin sees Facturación with all 4 items (has billing:read + billing:update)', () => {
      const visible = getVisibleNav(makeHasAny('site_admin'), false);
      const billing = visible.find((g) => g.label === 'Facturación')!;
      expect(billing.entries).toHaveLength(4);
    });

    it('corp_admin sees Facturación but NOT Aprobación (no billing:update)', () => {
      const visible = getVisibleNav(makeHasAny('corp_admin'), false);
      const billing = visible.find((g) => g.label === 'Facturación')!;
      expect(billing.entries.some((e) => e.basePath === '/billing')).toBe(true);
      expect(billing.entries.some((e) => e.basePath === '/billing/approve')).toBe(false);
    });

    it('operator does NOT see Facturación (no billing perms)', () => {
      const visible = getVisibleNav(makeHasAny('operator'), false);
      const groupLabels = visible.map((g) => g.label);
      expect(groupLabels).not.toContain('Facturación');
    });

    it('operator does NOT see Analítica (no dashboard_executive:read)', () => {
      const visible = getVisibleNav(makeHasAny('operator'), false);
      const groupLabels = visible.map((g) => g.label);
      expect(groupLabels).not.toContain('Analítica');
    });

    it('operator sees Operaciones items but NOT Visión General executive items', () => {
      const visible = getVisibleNav(makeHasAny('operator'), false);
      const all = visible.flatMap((g) => g.entries);
      expect(all.some((e) => e.basePath === '/operacional/monitoreo')).toBe(true);
      expect(all.some((e) => e.basePath === '/dashboard/consolidado')).toBe(false);
    });

    it('auditor sees Auditoría group', () => {
      const visible = getVisibleNav(makeHasAny('auditor'), false);
      const groupLabels = visible.map((g) => g.label);
      expect(groupLabels).toContain('Auditoría');
    });

    it('empty groups are excluded', () => {
      const noPerms = () => false;
      const visible = getVisibleNav(noPerms, false);
      expect(visible).toHaveLength(0);
    });

    it('each visible entry still has all required fields', () => {
      const visible = getVisibleNav(makeHasAny('site_admin'), false);
      visible.flatMap((g) => g.entries).forEach((entry) => {
        expect(entry.icon).toBeTruthy();
        expect(entry.to).toMatch(/^\//);
        expect(entry.basePath).toMatch(/^\//);
      });
    });
  });

  describe('platformOnly entries', () => {
    it('Tenants y Malls is platformOnly', () => {
      const entry = allEntries().find((e) => e.basePath === '/admin/tenants-malls');
      expect(entry?.platformOnly).toBe(true);
    });

    it('Observabilidad is platformOnly', () => {
      const entry = allEntries().find((e) => e.basePath === '/admin/observabilidad');
      expect(entry?.platformOnly).toBe(true);
    });

    it('Config y Releases is platformOnly', () => {
      const entry = allEntries().find((e) => e.basePath === '/admin/config-releases');
      expect(entry?.platformOnly).toBe(true);
    });

    it('Usuarios y Roles is NOT platformOnly', () => {
      const entry = allEntries().find((e) => e.basePath === '/admin/users');
      expect(entry?.platformOnly).toBeUndefined();
    });

    it('Facturas is NOT platformOnly (tenant-scoped but always visible)', () => {
      const entry = allEntries().find((e) => e.basePath === '/billing');
      expect(entry?.platformOnly).toBeUndefined();
    });
  });
});
