import { describe, it, expect } from 'vitest';
import { PROFILE_NAV, type ProfileNavEntry } from './profile-nav';
import { ALL_PROFILES, type UserProfile } from './profiles';

/** Collect all route paths from a nav entry (direct + children). */
function collectRoutes(entry: ProfileNavEntry): string[] {
  const routes: string[] = [];
  entry.to && routes.push(entry.to);
  entry.children?.forEach((sub) => routes.push(sub.to));
  return routes;
}

describe('profile-nav', () => {
  describe('PROFILE_NAV', () => {
    it('has entries for every profile in ALL_PROFILES', () => {
      ALL_PROFILES.forEach((profile) => {
        expect(PROFILE_NAV[profile as UserProfile]).toBeDefined();
      });
    });

    it.each(ALL_PROFILES)('profile "%s" has at least one nav entry', (profile) => {
      const entries = PROFILE_NAV[profile as UserProfile];
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('entry structure', () => {
    const allEntries = Object.entries(PROFILE_NAV).flatMap(([profile, entries]) =>
      entries.map((entry) => ({ profile, entry })),
    );

    it.each(allEntries)('$profile → "$entry.label" has icon and basePath', ({ entry }) => {
      expect(entry.icon).toBeTruthy();
      expect(entry.basePath).toMatch(/^\//);
    });

    it.each(allEntries)('$profile → "$entry.label" has either children or direct route', ({ entry }) => {
      const hasChildren = (entry.children?.length ?? 0) > 0;
      const hasDirect = !!entry.to;
      expect(hasChildren || hasDirect).toBe(true);
    });
  });

  describe('route validity', () => {
    const allRoutes = Object.entries(PROFILE_NAV).flatMap(([profile, entries]) =>
      entries.flatMap((entry) => collectRoutes(entry).map((route) => ({ profile, label: entry.label, route }))),
    );

    it.each(allRoutes)('$profile → "$label" route "$route" starts with /', ({ route }) => {
      expect(route).toMatch(/^\//);
    });
  });

  describe('no duplicate basePaths within a profile', () => {
    it.each(ALL_PROFILES)('profile "%s" has unique basePaths', (profile) => {
      const entries = PROFILE_NAV[profile as UserProfile];
      const basePaths = entries.map((e) => e.basePath);
      expect(new Set(basePaths).size).toBe(basePaths.length);
    });
  });

  describe('profile-specific assertions', () => {
    it('gerencial has "Panel Consolidado" as first entry', () => {
      expect(PROFILE_NAV.gerencial[0].label).toBe('Panel Consolidado');
    });

    it('gerencial does not have Integraciones or Administración', () => {
      const labels = PROFILE_NAV.gerencial.map((e) => e.label);
      expect(labels).not.toContain('Integraciones');
      expect(labels).not.toContain('Administración');
    });

    it('operacional has Alertas with 7 sub-items (gestión, tickets, main, rules, escalation, notifications, history)', () => {
      const alertas = PROFILE_NAV.operacional.find((e) => e.label === 'Alertas');
      expect(alertas?.children).toHaveLength(7);
    });

    it('tecnico has Órdenes, Medidores, Registro, and Alertas', () => {
      const labels = PROFILE_NAV.tecnico.map((e) => e.label);
      expect(labels).toEqual(['Órdenes', 'Medidores', 'Registro', 'Alertas']);
    });

    it('auditor has "Auditoría" section with audit-related sub-items', () => {
      const auditoria = PROFILE_NAV.auditor.find((e) => e.label === 'Auditoría');
      expect(auditoria).toBeDefined();
      const subRoutes = auditoria!.children!.map((c) => c.to);
      expect(subRoutes).toContain('/admin/audit');
      expect(subRoutes).toContain('/admin/data-quality');
    });

    it('super_admin has all major sections', () => {
      const labels = PROFILE_NAV.super_admin.map((e) => e.label);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('Monitoreo');
      expect(labels).toContain('Alertas');
      expect(labels).toContain('Facturación');
      expect(labels).toContain('Reportes y Analítica');
      expect(labels).toContain('Integraciones');
      expect(labels).toContain('Administración');
    });

    it('super_admin Administración has Empresas sub-item', () => {
      const admin = PROFILE_NAV.super_admin.find((e) => e.label === 'Administración');
      const subLabels = admin!.children!.map((c) => c.label);
      expect(subLabels).toContain('Empresas');
    });

    it('locatario has only Facturación with one sub-item', () => {
      expect(PROFILE_NAV.locatario).toHaveLength(1);
      expect(PROFILE_NAV.locatario[0].label).toBe('Facturación');
      expect(PROFILE_NAV.locatario[0].children).toHaveLength(1);
    });
  });
});
