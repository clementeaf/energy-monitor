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

  describe('spec-aligned profile assertions (6 screens each)', () => {
    it('gerencial has exactly 3 nav groups: Panel Consolidado, Alarmas, Reportes', () => {
      const labels = PROFILE_NAV.gerencial.map((e) => e.label);
      expect(labels).toEqual(['Panel Consolidado', 'Alarmas', 'Reportes']);
    });

    it('gerencial Panel Consolidado has 3 sub-items: Consolidado, Consumo, Costos', () => {
      const panel = PROFILE_NAV.gerencial[0];
      expect(panel.children).toHaveLength(3);
    });

    it('operacional has exactly 3 nav groups: Monitoreo, Alertas, Calidad', () => {
      const labels = PROFILE_NAV.operacional.map((e) => e.label);
      expect(labels).toEqual(['Monitoreo', 'Alertas', 'Calidad']);
    });

    it('operacional Alertas has 2 sub-items: Gestión, Tickets y SLA', () => {
      const alertas = PROFILE_NAV.operacional.find((e) => e.label === 'Alertas');
      expect(alertas?.children).toHaveLength(2);
    });

    it('tecnico has exactly 3 nav groups: Órdenes, Medidores, Registro', () => {
      const labels = PROFILE_NAV.tecnico.map((e) => e.label);
      expect(labels).toEqual(['Órdenes', 'Medidores', 'Registro']);
    });

    it('auditor has exactly 1 nav group: Auditoría with 6 sub-items', () => {
      expect(PROFILE_NAV.auditor).toHaveLength(1);
      expect(PROFILE_NAV.auditor[0].label).toBe('Auditoría');
      expect(PROFILE_NAV.auditor[0].children).toHaveLength(6);
    });

    it('super_admin has exactly 2 nav groups: Administración, Integraciones', () => {
      const labels = PROFILE_NAV.super_admin.map((e) => e.label);
      expect(labels).toEqual(['Administración', 'Integraciones']);
    });

    it('super_admin Administración has 5 sub-items (spec screens minus Integraciones)', () => {
      const admin = PROFILE_NAV.super_admin.find((e) => e.label === 'Administración');
      expect(admin?.children).toHaveLength(5);
    });

    it('no locatario profile exists (not in spec)', () => {
      expect('locatario' in PROFILE_NAV).toBe(false);
    });
  });
});
