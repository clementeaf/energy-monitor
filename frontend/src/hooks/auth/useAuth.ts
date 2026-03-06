import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useMicrosoftAuth } from './useMicrosoftAuth';
import { useGoogleAuth } from './useGoogleAuth';
import { fetchMe } from '../../services/endpoints';
import type { AuthUser } from '../../types/auth';

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
    console.error('[resolveBackendUser] error:', err);
    sessionStorage.removeItem('access_token');
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 403) {
      setError('Cuenta pendiente de activación por un administrador');
    } else {
      clearUser();
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error al verificar sesión: ${status ?? 'network'} — ${msg}`);
    }
  }
}

export function useAuth() {
  const microsoft = useMicrosoftAuth();
  const google = useGoogleAuth();
  const store = useAuthStore();
  const resolving = useRef(false);

  // Handle MSAL redirect flow: after Microsoft redirects back, MSAL is authenticated
  // but store is empty. Acquire token silently and call backend.
  useEffect(() => {
    if (resolving.current) return;
    if (store.isAuthenticated || store.isLoading || store.error) return;
    if (!microsoft.isAuthenticated || !microsoft.user) return;

    resolving.current = true;
    store.setLoading(true);
    microsoft.acquireTokenSilently().then((idToken) => {
      if (idToken) {
        return resolveBackendUser(store.setUser, store.setError, store.clearUser);
      } else {
        store.setError('No se pudo obtener el token de Microsoft');
      }
    }).finally(() => {
      store.setLoading(false);
      resolving.current = false;
    });
  }, [microsoft.isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loginMicrosoft() {
    store.setLoading(true);
    store.setError(null);
    await microsoft.login();
  }

  async function loginGoogle(credential?: string) {
    store.setLoading(true);
    store.setError(null);
    try {
      if (credential) {
        google.onGoogleSuccess(credential);
      }
      await resolveBackendUser(store.setUser, store.setError, store.clearUser);
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
        // Logout failed — store already cleared
      }
    }
  }

  const isLoading = store.isLoading || microsoft.isLoading;

  if (store.isAuthenticated && store.user) {
    return {
      user: store.user,
      isAuthenticated: true,
      isLoading: false,
      error: store.error,
      login: loginMicrosoft,
      loginGoogle,
      logout: handleLogout,
    };
  }

  return {
    user: null as AuthUser | null,
    isAuthenticated: false,
    isLoading,
    error: store.error,
    login: loginMicrosoft,
    loginGoogle,
    logout: handleLogout,
  };
}
