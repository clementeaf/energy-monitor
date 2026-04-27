import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/auth/useAuth';

export function LoginPage() {
  const { loginMicrosoft, loginGoogle, error, isLoading, mfaPending, validateMfa } = useAuth();
  const [mfaCode, setMfaCode] = useState('');

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length === 6) {
      validateMfa(mfaCode);
    }
  };

  const btnClass =
    'flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Energy Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mfaPending ? 'Ingresa tu código de verificación' : 'Inicia sesion para continuar'}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* MFA code input */}
        {mfaPending ? (
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Código de autenticación (6 dígitos)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-center font-mono text-xl tracking-[0.3em]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || mfaCode.length !== 6}
              className="w-full rounded-lg bg-[var(--color-primary,#3D3BF3)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Verificando...' : 'Verificar'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Abre tu app de autenticación y copia el código de 6 dígitos.
            </p>
          </form>
        ) : (
          /* OAuth provider buttons */
          <div className="space-y-3">
            <button
              type="button"
              onClick={loginMicrosoft}
              disabled={isLoading}
              className={btnClass}
            >
              <svg className="h-5 w-5" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Continuar con Microsoft
            </button>

            <GoogleLogin
              onSuccess={(response) => {
                if (response.credential) {
                  loginGoogle(response.credential);
                }
              }}
              width="336"
              text="continue_with"
              shape="rectangular"
              logo_alignment="left"
            />
          </div>
        )}
      </div>
    </div>
  );
}
