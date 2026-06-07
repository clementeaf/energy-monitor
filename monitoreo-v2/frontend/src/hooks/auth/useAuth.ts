import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '../../store/useAuthStore';
import { authEndpoints } from '../../services/endpoints';
import type { MfaSetupResponse } from '../../services/endpoints';
import { useMicrosoftAuth } from './useMicrosoftAuth';
import { setSessionFlag, clearSessionFlag } from './useSessionResolver';
import type { AuthProvider, MeResponse } from '../../types/auth';
import { applyTenantTheme } from '../../lib/tenant-theme';
import { startSsoLogin } from '../../hooks/queries/useSsoQuery';
import { clearDevBearerToken } from '../../services/api';
import {
  captureDevAccessToken,
  finalizeAuthSession,
  type AuthSessionPayload,
} from './finalizeAuthSession';

/**
 * Reads HTTP status from an Axios-like error.
 */
function axiosStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

export function useAuth() {
  const { user, tenant, isAuthenticated, isLoading, error, setSession, clearSession, setLoading, setError } =
    useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const microsoft = useMicrosoftAuth();
  const msResolved = useRef(false);
  const [mfaPending, setMfaPending] = useState<{ userId: string } | null>(null);
  const [mfaSetupData, setMfaSetupData] = useState<MfaSetupResponse | null>(null);
  const [mfaSetupUserId, setMfaSetupUserId] = useState<string | null>(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[] | null>(null);

  const applyMeResponse = useCallback(
    (data: MeResponse) => {
      const { buildings, ...usr } = data.user;
      setSessionFlag();
      setSession(usr, data.tenant, buildings ?? []);
      applyTenantTheme(data.tenant);
      const returnTo = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(returnTo, { replace: true });
    },
    [navigate, location.state, setSession],
  );

  const reportSessionFailure = useCallback(
    (message: string) => {
      setError(message);
      setLoading(false);
      clearSessionFlag();
      clearDevBearerToken();
      clearSession();
    },
    [setError, setLoading, clearSession],
  );

  const completeAuthSession = useCallback(
    async (authData?: AuthSessionPayload): Promise<void> => {
      await finalizeAuthSession({
        authData,
        applyMeResponse,
        onFailure: reportSessionFailure,
      });
    },
    [applyMeResponse, reportSessionFailure],
  );

  const loginWithProvider = useCallback(
    async (provider: AuthProvider, idToken: string) => {
      setLoading(true);
      setError(null);
      setMfaPending(null);
      setMfaSetupData(null);
      setMfaSetupUserId(null);
      setMfaRecoveryCodes(null);

      try {
        const { data } = await authEndpoints.login(provider, idToken);
        captureDevAccessToken(data);

        if (data.mfaRequired && data.userId) {
          setMfaPending({ userId: data.userId });
          setLoading(false);
          return;
        }

        if (data.mfaSetupRequired) {
          if (data.userId) {
            setMfaSetupUserId(data.userId);
          }
          if (data.qrDataUrl && data.secret) {
            setMfaSetupData({
              secret: data.secret,
              qrDataUrl: data.qrDataUrl,
              otpauthUrl: data.otpauthUrl ?? '',
            });
          } else {
            const { data: setup } = await authEndpoints.mfaSetup();
            setMfaSetupData(setup);
          }
          setLoading(false);
          return;
        }

        await completeAuthSession(data);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Error al iniciar sesion';
        setError(message);
        setLoading(false);
      }
    },
    [completeAuthSession, setLoading, setError],
  );

  const validateMfa = useCallback(
    async (code: string) => {
      if (!mfaPending) return;
      setLoading(true);
      setError(null);

      try {
        const { data } = await authEndpoints.mfaValidate(mfaPending.userId, code);
        await completeAuthSession(data);
        setMfaPending(null);
      } catch (err: unknown) {
        if ((err as Error).message === 'auth_session_failed') {
          return;
        }
        setError(
          axiosStatus(err) === 401
            ? 'Código MFA inválido.'
            : 'No se pudo validar MFA. Recarga la página e intenta de nuevo.',
        );
        setLoading(false);
      }
    },
    [mfaPending, completeAuthSession, setLoading, setError],
  );

  const regenerateMfaSetup = useCallback(async () => {
    if (!mfaSetupUserId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: setup } = await authEndpoints.mfaSetup(true);
      setMfaSetupData(setup);
    } catch {
      setError('No se pudo generar un nuevo QR. Recarga la página.');
    } finally {
      setLoading(false);
    }
  }, [mfaSetupUserId, setLoading, setError]);

  const finishMfaSetupAfterRecovery = useCallback(async () => {
    setMfaRecoveryCodes(null);
    setLoading(true);
    setError(null);

    try {
      await completeAuthSession();
    } catch (err: unknown) {
      if ((err as Error).message !== 'auth_session_failed') {
        setError('No se pudo completar la sesión. Recarga e intenta de nuevo.');
        setLoading(false);
      }
    }
  }, [completeAuthSession, setLoading, setError]);

  const verifyMfaSetup = useCallback(
    async (code: string) => {
      if (!mfaSetupData || !mfaSetupUserId) return;
      setLoading(true);
      setError(null);

      try {
        const { data } = await authEndpoints.mfaVerifySetup(mfaSetupUserId, code);
        captureDevAccessToken(data);

        if (data.recoveryCodes && data.recoveryCodes.length > 0) {
          setMfaRecoveryCodes(data.recoveryCodes);
          setLoading(false);
          return;
        }

        await completeAuthSession(data);
        setMfaSetupData(null);
        setMfaSetupUserId(null);
      } catch (err: unknown) {
        if ((err as Error).message === 'auth_session_failed') {
          return;
        }
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(
          axiosStatus(err) === 400
            ? (message ?? 'Código inválido. Escanea el QR actual o ingresa la clave manual.')
            : 'No se pudo verificar MFA. Recarga la página e intenta de nuevo.',
        );
        setLoading(false);
      }
    },
    [mfaSetupData, mfaSetupUserId, completeAuthSession, setLoading, setError],
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

  /**
   * Redirects browser to tenant OIDC IdP via backend /auth/sso/:slug/start.
   */
  const loginWithSso = useCallback(
    async (tenantSlug: string) => {
      setLoading(true);
      setError(null);
      try {
        const redirectUrl = await startSsoLogin(tenantSlug);
        window.location.assign(redirectUrl);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Error al iniciar sesion SSO';
        setError(message);
        setLoading(false);
      }
    },
    [setLoading, setError],
  );

  /**
   * Handles post-SSO-callback query params (?mfaRequired, ?mfaSetupRequired).
   */
  const handleSsoCallbackParams = useCallback(
    async (params: URLSearchParams) => {
      const mfaRequired = params.get('mfaRequired') === '1';
      const mfaSetupRequired = params.get('mfaSetupRequired') === '1';
      const userId = params.get('userId');

      if (!mfaRequired && !mfaSetupRequired) return false;

      setLoading(true);
      setError(null);

      try {
        if (mfaRequired && userId) {
          setMfaPending({ userId });
          setLoading(false);
          return true;
        }

        if (mfaSetupRequired) {
          const { data: setup } = await authEndpoints.mfaSetup();
          setMfaSetupData(setup);
          setLoading(false);
          return true;
        }
      } catch {
        setError('Error al procesar el inicio de sesion SSO.');
        setLoading(false);
      }

      return true;
    },
    [setLoading, setError],
  );

  const logout = useCallback(async () => {
    try {
      await authEndpoints.logout();
    } catch {
      // Ignore
    }
    clearSessionFlag();
    clearDevBearerToken();
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
    loginWithSso,
    handleSsoCallbackParams,
    logout,
    mfaPending,
    validateMfa,
    mfaSetupData,
    regenerateMfaSetup,
    verifyMfaSetup,
    finishMfaSetupAfterRecovery,
    mfaRecoveryCodes,
    setMfaRecoveryCodes,
  };
}
