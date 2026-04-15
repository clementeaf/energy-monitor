import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from './usePermissions';
import { useAuthStore } from '../store/useAuthStore';
import type { AuthUser, TenantTheme } from '../types/auth';

const mockTenant: TenantTheme = {
  primaryColor: '#3D3BF3',
  secondaryColor: '#1E1E2F',
  sidebarColor: '#1E1E2F',
  accentColor: '#10B981',
  appTitle: 'Test',
  logoUrl: null,
  faviconUrl: null,
};

function setUser(overrides: Partial<AuthUser> = {}) {
  const user: AuthUser = {
    id: 'u-1',
    email: 'test@test.com',
    displayName: 'Test',
    role: { id: 'r-1', slug: 'corp_admin', name: 'Corp Admin' },
    permissions: ['buildings:read', 'meters:read', 'billing:create'],
    buildingIds: [],
    authProvider: 'google',
    lastLoginAt: null,
    ...overrides,
  };
  useAuthStore.getState().setSession(user, mockTenant, []);
}

describe('usePermissions', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('returns empty permSet when no user', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.permSet.size).toBe(0);
    expect(result.current.roleSlug).toBeNull();
  });

  describe('has', () => {
    it('returns true for existing permission', () => {
      setUser();
      const { result } = renderHook(() => usePermissions());
      expect(result.current.has('buildings', 'read')).toBe(true);
    });

    it('returns false for missing permission', () => {
      setUser();
      const { result } = renderHook(() => usePermissions());
      expect(result.current.has('buildings', 'delete')).toBe(false);
    });
  });

  describe('hasAny', () => {
    it('returns true if any permission matches', () => {
      setUser();
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAny('buildings:read', 'alerts:read')).toBe(true);
    });

    it('returns false if none match', () => {
      setUser();
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAny('alerts:read', 'reports:read')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('returns true for super_admin', () => {
      setUser({ role: { id: 'r-1', slug: 'super_admin', name: 'Super Admin' } });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
    });

    it('returns true for corp_admin', () => {
      setUser({ role: { id: 'r-1', slug: 'corp_admin', name: 'Corp Admin' } });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
    });

    it('returns true for site_admin', () => {
      setUser({ role: { id: 'r-1', slug: 'site_admin', name: 'Site Admin' } });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
    });

    it('returns false for operator', () => {
      setUser({ role: { id: 'r-1', slug: 'operator', name: 'Operator' } });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(false);
    });

    it('returns false for tenant_user', () => {
      setUser({ role: { id: 'r-1', slug: 'tenant_user', name: 'Tenant User' } });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe('roleSlug', () => {
    it('returns user role slug', () => {
      setUser({ role: { id: 'r-1', slug: 'analyst', name: 'Analyst' } });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.roleSlug).toBe('analyst');
    });
  });
});
