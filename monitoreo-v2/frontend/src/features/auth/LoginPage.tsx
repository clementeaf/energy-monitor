import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/auth/useAuth';

export function LoginPage() {
  const {
    loginMicrosoft, loginGoogle, error, isLoading,
    mfaPending, validateMfa,
    mfaSetupData, verifyMfaSetup,
    mfaRecoveryCodes, setMfaRecoveryCodes,
  } = useAuth();
  const [mfaCode, setMfaCode] = useState('');
  const [setupCode, setSetupCode] = useState('');

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length === 6) validateMfa(mfaCode);
  };

  const handleSetupVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupCode.length === 6) verifyMfaSetup(setupCode);
  };

  const btnClass =
    'flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50';

  const subtitle = mfaSetupData
    ? 'Configura tu autenticación de dos factores'
    : mfaPending
      ? 'Ingresa tu código de verificación'
      : 'Inicia sesión para continuar';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Energy Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Recovery codes after MFA setup */}
        {mfaRecoveryCodes ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">Códigos de recuperación</p>
              <p className="mt-1 text-xs text-amber-600">
                Guarda estos códigos en un lugar seguro. Los necesitarás si pierdes acceso a tu app de autenticación.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {mfaRecoveryCodes.map((code) => (
                  <code key={code} className="rounded bg-white px-2 py-1 text-center font-mono text-xs text-gray-800">
                    {code}
                  </code>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMfaRecoveryCodes(null)}
              className="w-full rounded-lg bg-[var(--color-primary,#3D3BF3)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Ya los guardé, continuar
            </button>
          </div>
        ) : mfaSetupData ? (
          /* MFA first-time setup — QR + verify */
          <form onSubmit={handleSetupVerify} className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-3 text-sm font-medium text-gray-700">
                1. Escanea este QR con tu app de autenticación
              </p>
              <p className="mb-2 text-xs text-gray-500">
                Google Authenticator, Microsoft Authenticator, Authy, etc.
              </p>
              <div className="flex justify-center">
                <img src={mfaSetupData.qrDataUrl} alt="MFA QR Code" className="h-48 w-48" />
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Código manual: <code className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs">{mfaSetupData.secret}</code>
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                2. Ingresa el código de 6 dígitos que muestra la app
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-center font-mono text-xl tracking-[0.3em]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || setupCode.length !== 6}
              className="w-full rounded-lg bg-[var(--color-primary,#3D3BF3)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Verificando...' : 'Activar MFA y continuar'}
            </button>
          </form>
        ) : mfaPending ? (
          /* MFA already configured — enter code */
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
            <p className="rounded-md bg-gray-50 p-3 text-xs leading-relaxed text-gray-500">
              Al iniciar sesión, autorizas la recopilación de tu nombre y correo electrónico
              desde tu proveedor OAuth (Microsoft/Google). Tus datos se almacenan en AWS
              con cifrado AES-256-GCM, se registra tu dirección IP para auditoría de
              seguridad (retención 2 años) y puedes ejercer tus derechos ARCO+ en cualquier
              momento desde tu perfil.{' '}
              <a href="/privacy-policy" className="underline hover:text-gray-700">
                Política de privacidad
              </a>
            </p>
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
