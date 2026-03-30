import { create } from 'zustand';
import type { AuthUser, BuildingRef, TenantTheme } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  tenant: TenantTheme | null;
  buildings: BuildingRef[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setSession: (user: AuthUser, tenant: TenantTheme, buildings: BuildingRef[]) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  tenant: null,
  buildings: [],
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setSession: (user, tenant, buildings) =>
    set({ user, tenant, buildings, isAuthenticated: true, isLoading: false, error: null }),

  clearSession: () =>
    set({ user: null, tenant: null, buildings: [], isAuthenticated: false, isLoading: false, error: null }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),
}));
