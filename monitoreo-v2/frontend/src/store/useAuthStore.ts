import { create } from 'zustand';
import type { AuthUser, BuildingRef, TenantTheme } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  tenant: TenantTheme | null;
  buildings: BuildingRef[];
  idleTimeoutMinutes: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setSession: (user: AuthUser, tenant: TenantTheme, buildings: BuildingRef[], idleTimeoutMinutes?: number) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  tenant: null,
  buildings: [],
  idleTimeoutMinutes: 15,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setSession: (user, tenant, buildings, idleTimeoutMinutes = 15) => {
    sessionStorage.setItem('auth_active', '1');
    set({ user, tenant, buildings, idleTimeoutMinutes, isAuthenticated: true, isLoading: false, error: null });
  },

  clearSession: () => {
    sessionStorage.removeItem('auth_active');
    set({ user: null, tenant: null, buildings: [], idleTimeoutMinutes: 15, isAuthenticated: false, isLoading: false, error: null });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),
}));
