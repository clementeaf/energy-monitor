import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/auth/useAuth';
import paIcon from '../../assets/pa-icon.png';

export function LoginPage() {
  const { isAuthenticated, isLoading, error, login, loginGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // Check for pending Google login (hash capture flow)
  useEffect(() => {
    if (sessionStorage.getItem('google_pending_login')) {
      sessionStorage.removeItem('google_pending_login');
      loginGoogle();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-pa-border bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="h-12 w-12 overflow-hidden">
            <img src={paIcon} alt="Parque Arauco" className="h-12 w-auto max-w-none" />
          </div>
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
            onClick={login}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-pa-border bg-white px-4 py-3 text-sm font-medium text-pa-text transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {isLoading ? 'Conectando...' : 'Continuar con Microsoft'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-pa-border" />
            <span className="text-xs text-pa-text-muted">o</span>
            <div className="h-px flex-1 bg-pa-border" />
          </div>

          {/* Google */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(res) => loginGoogle(res.credential)}
              onError={() => loginGoogle()}
              theme="outline"
              size="large"
              width="100%"
              text="continue_with"
            />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-pa-text-muted">
          Necesitas una invitación activa para acceder
        </p>
      </div>
    </div>
  );
}
