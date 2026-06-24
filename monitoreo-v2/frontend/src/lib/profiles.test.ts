import { describe, it, expect } from 'vitest';
import {
  ROLE_TO_PROFILE,
  ALL_PROFILES,
  PROFILE_LABELS,
  resolveProfile,
  type UserProfile,
} from './profiles';
import type { RoleSlug } from '../types/auth';

const ALL_ROLE_SLUGS: RoleSlug[] = [
  'super_admin',
  'corp_admin',
  'site_admin',
  'operator',
  'tenant_user',
  'analyst',
  'auditor',
];

describe('profiles', () => {
  describe('ROLE_TO_PROFILE', () => {
    it.each(ALL_ROLE_SLUGS)('maps "%s" to a valid profile', (slug) => {
      const profile = ROLE_TO_PROFILE[slug];
      expect(profile).toBeDefined();
      expect(ALL_PROFILES).toContain(profile);
    });

    it('maps corp_admin and analyst to gerencial', () => {
      expect(ROLE_TO_PROFILE.corp_admin).toBe('gerencial');
      expect(ROLE_TO_PROFILE.analyst).toBe('gerencial');
    });

    it('maps site_admin to operacional', () => {
      expect(ROLE_TO_PROFILE.site_admin).toBe('operacional');
    });

    it('maps operator to tecnico', () => {
      expect(ROLE_TO_PROFILE.operator).toBe('tecnico');
    });

    it('maps auditor to auditor', () => {
      expect(ROLE_TO_PROFILE.auditor).toBe('auditor');
    });

    it('maps super_admin to super_admin', () => {
      expect(ROLE_TO_PROFILE.super_admin).toBe('super_admin');
    });

    it('maps tenant_user to locatario', () => {
      expect(ROLE_TO_PROFILE.tenant_user).toBe('locatario');
    });
  });

  describe('ALL_PROFILES', () => {
    it('contains exactly 6 profiles', () => {
      expect(ALL_PROFILES).toHaveLength(6);
    });

    it('covers all profiles produced by ROLE_TO_PROFILE', () => {
      const mapped = new Set(Object.values(ROLE_TO_PROFILE));
      mapped.forEach((profile) => {
        expect(ALL_PROFILES).toContain(profile);
      });
    });
  });

  describe('PROFILE_LABELS', () => {
    it.each(ALL_PROFILES)('has a Spanish label for profile "%s"', (profile) => {
      const label = PROFILE_LABELS[profile as UserProfile];
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
    });
  });

  describe('resolveProfile', () => {
    it.each(ALL_ROLE_SLUGS)('resolves "%s" to a valid profile', (slug) => {
      const profile = resolveProfile(slug);
      expect(ALL_PROFILES).toContain(profile);
    });

    it('returns locatario for null', () => {
      expect(resolveProfile(null)).toBe('locatario');
    });
  });
});
