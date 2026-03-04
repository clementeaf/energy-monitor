import { useAuthStore } from '../../store/useAuthStore';
import { useMicrosoftAuth } from './useMicrosoftAuth';
import { useGoogleAuth } from './useGoogleAuth';
import { useDemoAuth } from './useDemoAuth';
import type { AuthUser } from '../../types/auth';

export function useAuth() {
  const microsoft = useMicrosoftAuth();
  const google = useGoogleAuth();
  const demo = useDemoAuth();
  const store = useAuthStore();

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

  function loginGoogle() {
    store.setError(null);
    google.login();
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

  // If already authenticated via store (demo, google, or persisted), use store data
  if (store.isAuthenticated && store.user) {
    return {
      user: store.user,
      isAuthenticated: true,
      isLoading: false,
      error: store.error,
      login: loginMicrosoft,
      loginGoogle,
      loginDemo: demo.login,
      logout: handleLogout,
    };
  }

  // If authenticated via MSAL (Microsoft), sync to store
  if (microsoft.isAuthenticated && microsoft.user) {
    if (!store.isAuthenticated) {
      store.setUser(microsoft.user);
    }
    return {
      user: microsoft.user,
      isAuthenticated: true,
      isLoading: false,
      error: store.error,
      login: loginMicrosoft,
      loginGoogle,
      loginDemo: demo.login,
      logout: handleLogout,
    };
  }

  return {
    user: null as AuthUser | null,
    isAuthenticated: false,
    isLoading: store.isLoading || microsoft.isLoading,
    error: store.error,
    login: loginMicrosoft,
    loginGoogle,
    loginDemo: demo.login,
    logout: handleLogout,
  };
}
