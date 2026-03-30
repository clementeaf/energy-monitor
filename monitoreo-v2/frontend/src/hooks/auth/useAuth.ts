import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/useAuthStore';
import { authEndpoints } from '../../services/endpoints';
import { useMicrosoftAuth } from './useMicrosoftAuth';
import { setSessionFlag, clearSessionFlag } from './useSessionResolver';
import type { AuthProvider } from '../../types/auth';

export function useAuth() {
  const { user, tenant, isAuthenticated, isLoading, error, setSession, clearSession, setLoading, setError } =
    useAuthStore();
  const navigate = useNavigate();
  const microsoft = useMicrosoftAuth();
  const msResolved = useRef(false);

  const loginWithProvider = useCallback(
    async (provider: AuthProvider, idToken: string) => {
      setLoading(true);
      setError(null);

      try {
        await authEndpoints.login(provider, idToken);
        const { data } = await authEndpoints.me();
        const { buildings, ...user } = data.user;
        setSessionFlag();
        setSession(user, data.tenant, buildings ?? []);
        applyTenantTheme(data.tenant.primaryColor, data.tenant.secondaryColor);
        navigate('/');
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Error al iniciar sesion';
        setError(message);
      }
    },
    [navigate, setSession, setLoading, setError],
  );

  // Detect Microsoft redirect completing — MSAL sets isAuthenticated after redirect
  useEffect(() => {
    if (!microsoft.isAuthenticated || microsoft.isLoading || msResolved.current) return;
    msResolved.current = true;

    microsoft.acquireTokenSilently().then((idToken) => {
      if (idToken) {
        loginWithProvider('microsoft', idToken);
      }
    });
  }, [microsoft.isAuthenticated, microsoft.isLoading, microsoft.acquireTokenSilently, loginWithProvider]);

  const loginMicrosoft = useCallback(() => {
    microsoft.login();
  }, [microsoft]);

  const loginGoogle = useCallback(
    async (credential: string) => {
      await loginWithProvider('google', credential);
    },
    [loginWithProvider],
  );

  const logout = useCallback(async () => {
    try {
      await authEndpoints.logout();
    } catch {
      // Ignore
    }
    clearSessionFlag();
    clearSession();
    if (microsoft.isAuthenticated) {
      microsoft.logout();
    } else {
      navigate('/login');
    }
  }, [clearSession, navigate, microsoft]);

  return {
    user,
    tenant,
    isAuthenticated,
    isLoading,
    error,
    loginMicrosoft,
    loginGoogle,
    logout,
  };
}

function applyTenantTheme(primaryColor: string, secondaryColor: string) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', primaryColor);
  root.style.setProperty('--color-secondary', secondaryColor);
}
