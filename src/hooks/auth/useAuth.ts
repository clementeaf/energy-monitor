import { useAuthStore } from '../../store/useAuthStore';
import { useMicrosoftAuth } from './useMicrosoftAuth';
import { useDemoAuth } from './useDemoAuth';
import type { AuthUser, Role } from '../../types/auth';

const authMode = import.meta.env.VITE_AUTH_MODE;

export function useAuth() {
  const microsoft = useMicrosoftAuth();
  const demo = useDemoAuth();
  const store = useAuthStore();

  // If already authenticated via store (demo or persisted), use store data
  if (store.isAuthenticated && store.user) {
    return {
      user: store.user,
      isAuthenticated: true,
      isLoading: false,
      error: store.error,
      login: loginMicrosoft,
      loginDemo: demo.login,
      logout: handleLogout,
    };
  }

  // If authenticated via MSAL (Microsoft), sync to store
  if (microsoft.isAuthenticated && microsoft.user) {
    // Sync Microsoft user to store if not already there
    if (!store.isAuthenticated) {
      store.setUser(microsoft.user);
    }
    return {
      user: microsoft.user,
      isAuthenticated: true,
      isLoading: false,
      error: store.error,
      login: loginMicrosoft,
      loginDemo: demo.login,
      logout: handleLogout,
    };
  }

  async function loginMicrosoft() {
    store.setLoading(true);
    store.setError(null);
    try {
      await microsoft.login();
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Microsoft');
    } finally {
      store.setLoading(false);
    }
  }

  async function handleLogout() {
    store.clearUser();
    if (microsoft.isAuthenticated) {
      try {
        await microsoft.logout();
      } catch {
        // Popup closed or logout failed — store already cleared
      }
    }
  }

  return {
    user: null as AuthUser | null,
    isAuthenticated: false,
    isLoading: store.isLoading || microsoft.isLoading,
    error: store.error,
    login: loginMicrosoft,
    loginDemo: demo.login,
    logout: handleLogout,
  };
}
