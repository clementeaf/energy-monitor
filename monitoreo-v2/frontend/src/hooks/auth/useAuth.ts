import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '../../store/useAuthStore';
import { authEndpoints } from '../../services/endpoints';
import type { MfaSetupResponse } from '../../services/endpoints';
import { useMicrosoftAuth } from './useMicrosoftAuth';
import { setSessionFlag, clearSessionFlag } from './useSessionResolver';
import type { AuthProvider } from '../../types/auth';
import { applyTenantTheme } from '../../lib/tenant-theme';

export function useAuth() {
  const { user, tenant, isAuthenticated, isLoading, error, setSession, clearSession, setLoading, setError } =
    useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const microsoft = useMicrosoftAuth();
  const msResolved = useRef(false);
  const [mfaPending, setMfaPending] = useState<{ userId: string } | null>(null);
  const [mfaSetupData, setMfaSetupData] = useState<MfaSetupResponse | null>(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[] | null>(null);

  const completeLogin = useCallback(async () => {
    const { data } = await authEndpoints.me();
    const { buildings, ...usr } = data.user;
    setSessionFlag();
    setSession(usr, data.tenant, buildings ?? []);
    applyTenantTheme(data.tenant);
    const returnTo = (location.state as { from?: string } | null)?.from ?? '/';
    navigate(returnTo, { replace: true });
  }, [navigate, location.state, setSession]);

  const loginWithProvider = useCallback(
    async (provider: AuthProvider, idToken: string) => {
      setLoading(true);
      setError(null);
      setMfaPending(null);
      setMfaSetupData(null);
      setMfaRecoveryCodes(null);

      try {
        const { data } = await authEndpoints.login(provider, idToken);

        if (data.mfaRequired && data.userId) {
          setMfaPending({ userId: data.userId });
          setLoading(false);
          return;
        }

        if (data.mfaSetupRequired) {
          // User authenticated but needs to configure MFA — fetch QR immediately
          const { data: setup } = await authEndpoints.mfaSetup();
          setMfaSetupData(setup);
          setLoading(false);
          return;
        }

        await completeLogin();
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Error al iniciar sesion';
        setError(message);
      }
    },
    [completeLogin, setLoading, setError],
  );

  const validateMfa = useCallback(
    async (code: string) => {
      if (!mfaPending) return;
      setLoading(true);
      setError(null);

      try {
        await authEndpoints.mfaValidate(mfaPending.userId, code);
        setMfaPending(null);
        await completeLogin();
      } catch {
        setError('Código MFA inválido.');
        setLoading(false);
      }
    },
    [mfaPending, completeLogin, setLoading, setError],
  );

  const verifyMfaSetup = useCallback(
    async (code: string) => {
      if (!mfaSetupData) return;
      setLoading(true);
      setError(null);

      try {
        const { data } = await authEndpoints.mfaVerify(code);
        if (data.recoveryCodes) {
          setMfaRecoveryCodes(data.recoveryCodes);
        }
        setMfaSetupData(null);
        await completeLogin();
      } catch {
        setError('Código inválido. Verifica que escaneaste el QR correctamente.');
        setLoading(false);
      }
    },
    [mfaSetupData, completeLogin, setLoading, setError],
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
    mfaPending,
    validateMfa,
    mfaSetupData,
    verifyMfaSetup,
    mfaRecoveryCodes,
    setMfaRecoveryCodes,
  };
}

