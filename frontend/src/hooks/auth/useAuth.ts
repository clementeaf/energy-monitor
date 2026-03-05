import { useAuthStore } from '../../store/useAuthStore';
import { useMicrosoftAuth } from './useMicrosoftAuth';
import { useGoogleAuth } from './useGoogleAuth';
import { useDemoAuth } from './useDemoAuth';
import { fetchMe } from '../../services/endpoints';
import type { AuthUser } from '../../types/auth';

const isDemoMode = import.meta.env.VITE_AUTH_MODE === 'demo';

async function resolveBackendUser(
  setUser: (user: AuthUser) => void,
  setError: (error: string | null) => void,
  clearUser: () => void,
) {
  try {
    const data = await fetchMe();
    if (!data?.user?.email) {
      throw new Error('Invalid response from /auth/me');
    }
    setUser(data.user);
  } catch (err: unknown) {
    sessionStorage.removeItem('access_token');
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 403) {
      setError('Cuenta pendiente de activación por un administrador');
    } else {
      clearUser();
      setError('Error al verificar sesión');
    }
  }
}

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
      // After popup resolves, the token should be in sessionStorage
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        // loginPopup resolved but no token — try acquireTokenSilent
        const silentToken = await microsoft.acquireTokenSilently();
        if (!silentToken) {
          store.setError('Microsoft login completó pero no se obtuvo token');
          store.setLoading(false);
          return;
        }
      }
      if (!isDemoMode) {
        await resolveBackendUser(store.setUser, store.setError, store.clearUser);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MSAL] loginMicrosoft error:', err);
      store.setError(`Error Microsoft: ${msg}`);
    } finally {
      store.setLoading(false);
    }
  }

  async function loginGoogle(credential?: string) {
    store.setLoading(true);
    store.setError(null);
    try {
      if (credential) {
        google.onGoogleSuccess(credential);
      }
      if (!isDemoMode) {
        await resolveBackendUser(store.setUser, store.setError, store.clearUser);
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
    } finally {
      store.setLoading(false);
    }
  }

  async function handleLogout() {
    store.clearUser();
    sessionStorage.removeItem('access_token');
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

  // MSAL detected an authenticated account (e.g. after redirect flow) but store is empty
  if (microsoft.isAuthenticated && microsoft.user) {
    if (!store.isAuthenticated && !store.isLoading && !store.error) {
      const token = sessionStorage.getItem('access_token');
      if (token && !isDemoMode) {
        // Token already in sessionStorage — call backend
        store.setLoading(true);
        resolveBackendUser(store.setUser, store.setError, store.clearUser).finally(() => {
          store.setLoading(false);
        });
      } else if (!token && !isDemoMode) {
        // Redirect flow: MSAL is authenticated but no token in sessionStorage yet
        store.setLoading(true);
        microsoft.acquireTokenSilently().then((idToken) => {
          if (idToken) {
            resolveBackendUser(store.setUser, store.setError, store.clearUser).finally(() => {
              store.setLoading(false);
            });
          } else {
            store.setLoading(false);
            store.setError('No se pudo obtener el token de Microsoft');
          }
        });
      } else if (isDemoMode) {
        store.setUser(microsoft.user);
      }
    }
    return {
      user: store.user ?? microsoft.user,
      isAuthenticated: store.isAuthenticated,
      isLoading: store.isLoading || microsoft.isLoading,
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
