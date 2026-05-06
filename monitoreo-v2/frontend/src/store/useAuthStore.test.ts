import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';
import type { AuthUser, TenantTheme, BuildingRef } from '../types/auth';

const mockUser: AuthUser = {
  id: 'u-1',
  email: 'test@test.com',
  displayName: 'Test User',
  role: { id: 'r-1', slug: 'corp_admin', name: 'Corp Admin' },
  permissions: ['buildings:read', 'meters:read'],
  buildingIds: ['b-1'],
  authProvider: 'google',
  lastLoginAt: null,
  privacyAccepted: true,
  requireMfaSetup: false,
  dataProcessingBlocked: false,
};

const mockTenant: TenantTheme = {
  primaryColor: '#3D3BF3',
  secondaryColor: '#1E1E2F',
  sidebarColor: '#1E1E2F',
  accentColor: '#10B981',
  appTitle: 'Energy Monitor',
  logoUrl: null,
  faviconUrl: null,
};

const mockBuildings: BuildingRef[] = [{ id: 'b-1', name: 'Building 1' }];

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      tenant: null,
      buildings: [],
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });
  });

  it('initializes with default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.buildings).toEqual([]);
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  describe('setSession', () => {
    it('sets user, tenant, buildings and marks authenticated', () => {
      useAuthStore.getState().setSession(mockUser, mockTenant, mockBuildings);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.tenant).toEqual(mockTenant);
      expect(state.buildings).toEqual(mockBuildings);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('clears previous error', () => {
      useAuthStore.getState().setError('old error');
      useAuthStore.getState().setSession(mockUser, mockTenant, mockBuildings);

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('resets all auth state', () => {
      useAuthStore.getState().setSession(mockUser, mockTenant, mockBuildings);
      useAuthStore.getState().clearSession();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tenant).toBeNull();
      expect(state.buildings).toEqual([]);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('sets loading state', () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);

      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });

  describe('setError', () => {
    it('sets error and clears loading', () => {
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().setError('Something failed');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Something failed');
      expect(state.isLoading).toBe(false);
    });

    it('can clear error with null', () => {
      useAuthStore.getState().setError('err');
      useAuthStore.getState().setError(null);

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
