import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/useAuthStore';
import { authEndpoints } from '../../services/endpoints';
import { useMicrosoftAuth } from './useMicrosoftAuth';
import type { AuthProvider } from '../../types/auth';

export function useAuth() {
  const { user, tenant, isAuthenticated, isLoading, error, setSession, clearSession, setLoading, setError } =
    useAuthStore();
  const navigate = useNavigate();
  const microsoft = useMicrosoftAuth();

  // On mount: try to resolve session from existing cookie
  useEffect(() => {
    let cancelled = false;

    const resolveSession = async () => {
      try {
        const { data } = await authEndpoints.me();
        if (!cancelled) {
          setSession(data.user, data.tenant);
          applyTenantTheme(data.tenant.primaryColor, data.tenant.secondaryColor);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      }
    };

    resolveSession();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loginWithProvider = useCallback(
    async (provider: AuthProvider, idToken: string) => {
      setLoading(true);
      setError(null);

      try {
        await authEndpoints.login(provider, idToken);
        const { data } = await authEndpoints.me();
        setSession(data.user, data.tenant);
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

  const loginMicrosoft = useCallback(async () => {
    try {
      const idToken = await microsoft.login();
      await loginWithProvider('microsoft', idToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error con Microsoft';
      setError(message);
    }
  }, [microsoft, loginWithProvider, setError]);

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
      // Ignore — cookies cleared server-side
    }
    clearSession();
    navigate('/login');
  }, [clearSession, navigate]);

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
