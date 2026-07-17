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

  describe('flat nav — wireframe v3 aligned', () => {
    it('gerencial has 6 flat entries', () => {
      expect(PROFILE_NAV.gerencial).toHaveLength(6);
      expect(PROFILE_NAV.gerencial.every((e) => !!e.to)).toBe(true);
    });

    it('operacional has 6 flat entries', () => {
      expect(PROFILE_NAV.operacional).toHaveLength(6);
      expect(PROFILE_NAV.operacional.every((e) => !!e.to)).toBe(true);
    });

    it('tecnico has 7 flat entries', () => {
      expect(PROFILE_NAV.tecnico).toHaveLength(7);
      expect(PROFILE_NAV.tecnico.every((e) => !!e.to)).toBe(true);
    });

    it('auditor has 6 flat entries', () => {
      expect(PROFILE_NAV.auditor).toHaveLength(6);
      const labels = PROFILE_NAV.auditor.map((e) => e.label);
      expect(labels).toEqual([
        'Calidad de Datos',
        'Cuadratura',
        'Pista de Auditoría',
        'Trazabilidad',
        'Datos Crudos',
        'Exportar Evidencia',
      ]);
      expect(PROFILE_NAV.auditor.every((e) => !!e.to)).toBe(true);
    });

    it('super_admin has grouped entries with children', () => {
      expect(PROFILE_NAV.super_admin.length).toBeGreaterThanOrEqual(3);
    });

    it('no locatario profile exists (not in spec)', () => {
      expect('locatario' in PROFILE_NAV).toBe(false);
    });
  });
});
