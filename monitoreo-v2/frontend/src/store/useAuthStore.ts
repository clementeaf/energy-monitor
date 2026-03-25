import { create } from 'zustand';
import type { AuthUser, TenantTheme } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  tenant: TenantTheme | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setSession: (user: AuthUser, tenant: TenantTheme) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setSession: (user, tenant) =>
    set({ user, tenant, isAuthenticated: true, isLoading: false, error: null }),

  clearSession: () =>
    set({ user: null, tenant: null, isAuthenticated: false, isLoading: false, error: null }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),
}));
