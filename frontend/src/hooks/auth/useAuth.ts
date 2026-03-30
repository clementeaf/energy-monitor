import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore, type UserMode } from '../../store/useAppStore';
import { useMicrosoftAuth } from './useMicrosoftAuth';
import { useGoogleAuth } from './useGoogleAuth';
import { fetchMe } from '../../services/endpoints';
import type { AuthUser } from '../../types/auth';

const INVITATION_TOKEN_KEY = 'invitation_token';
const VALID_USER_MODES: UserMode[] = ['holding', 'multi_operador', 'operador', 'tecnico'];

async function resolveBackendUser(
  setUser: (user: AuthUser) => void,
  setError: (error: string | null) => void,
  clearUser: () => void,
) {
  try {
    const invitationToken = sessionStorage.getItem(INVITATION_TOKEN_KEY) ?? undefined;
    const data = await fetchMe(invitationToken);
    if (!data?.user?.email) {
      throw new Error('Invalid response from /auth/me');
    }
    sessionStorage.removeItem(INVITATION_TOKEN_KEY);
    // Apply server-assigned userMode
    if (data.user.userMode && VALID_USER_MODES.includes(data.user.userMode as UserMode)) {
      useAppStore.getState().setUserMode(data.user.userMode as UserMode);
    }
    setUser(data.user);
  } catch (err: unknown) {
    console.error('[resolveBackendUser] error:', err);
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 403) {
      sessionStorage.removeItem('access_token');
      clearUser();
      if (sessionStorage.getItem(INVITATION_TOKEN_KEY)) {
        setError('La invitación es inválida, expiró o no coincide con la cuenta usada para iniciar sesión.');
      } else {
        setError('Cuenta sin invitación activa o pendiente de habilitación');
      }
    } else if (status === 401) {
      // Token expired or invalid — clear and let interceptor handle redirect
      sessionStorage.removeItem('access_token');
      clearUser();
    } else {
      // Network error / timeout — don't clear token, it may still be valid
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

  // Tras redirect de Microsoft: MSAL autentica pero el store sigue vacío.
  // No bloquear por store.error (un fallo previo impedía reintentar). Esperar a que MSAL termine (None).
  useEffect(() => {
    if (resolving.current) return;
    if (store.isAuthenticated || store.isLoading) return;
    if (!microsoft.isAuthenticated || !microsoft.user) return;
    if (microsoft.isLoading) return;

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
  }, [
    microsoft.isAuthenticated,
    microsoft.isLoading,
    microsoft.user?.email,
    store.isAuthenticated,
    store.isLoading,
  ]);

  async function loginMicrosoft() {
    store.setLoading(true);
    store.setError(null);
    try {
      await microsoft.login();
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
