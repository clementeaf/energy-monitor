import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/auth/useAuth';
type ActiveProvider = null | 'microsoft' | 'google';

export function LoginPage() {
  const { isAuthenticated, isLoading, error, login, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [activeProvider, setActiveProvider] = useState<ActiveProvider>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // Clear active provider when loading finishes
  useEffect(() => {
    if (!isLoading) setActiveProvider(null);
  }, [isLoading]);

  // Check for pending Google login (hash capture flow)
  useEffect(() => {
    if (sessionStorage.getItem('google_pending_login')) {
      sessionStorage.removeItem('google_pending_login');
      setActiveProvider('google');
      loginGoogle();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: (response) => {
      sessionStorage.setItem('access_token', response.access_token);
      loginGoogle();
    },
    onError: () => {
      setActiveProvider(null);
      loginGoogle();
    },
  });

  function handleMicrosoft() {
    if (isLoading) return;
    setActiveProvider('microsoft');
    login();
  }

  function handleGoogle() {
    if (isLoading) return;
    setActiveProvider('google');
    googleLogin();
  }

  const msLoading = isLoading && activeProvider === 'microsoft';
  const gLoading = isLoading && activeProvider === 'google';

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-pa-border bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-pa-navy">Energy Monitor</h1>
            <p className="mt-1 text-sm text-pa-text-muted">Inicia sesión para continuar</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          {/* Microsoft */}
          <button
            type="button"
            onClick={handleMicrosoft}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-pa-border bg-white px-4 py-3 text-sm font-medium text-pa-text transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {msLoading ? 'Conectando...' : 'Continuar con Microsoft'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-pa-border" />
            <span className="text-xs text-pa-text-muted">o</span>
            <div className="h-px flex-1 bg-pa-border" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-pa-border bg-white px-4 py-3 text-sm font-medium text-pa-text transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {gLoading ? 'Conectando...' : 'Continuar con Google'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-pa-text-muted">
          Necesitas una invitación activa para acceder
        </p>
      </div>
    </div>
  );
}
