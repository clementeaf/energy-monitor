import { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
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

  const googleLogin = useGoogleLogin({
    onSuccess: useCallback((response: { access_token: string }) => {
      loginGoogle(response.access_token);
    }, [loginGoogle]),
  });

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
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">MFA activado correctamente</p>
              <p className="mt-1 text-xs text-green-700">
                Tu cuenta ahora tiene verificación en dos pasos.
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Códigos de recuperación</p>
              <p className="mt-1 text-xs text-amber-600">
                Si pierdes tu celular o cambias de teléfono, usa uno de estos códigos para ingresar.
                Cada código funciona una sola vez. Guárdalos en un lugar seguro (foto, nota, impresión).
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
              Ya los guardé, entrar a la plataforma
            </button>
          </div>
        ) : mfaSetupData ? (
          /* MFA first-time setup — guided flow */
          <form onSubmit={handleSetupVerify} className="space-y-4">
            {/* What is MFA */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">¿Qué es la verificación en dos pasos?</p>
              <p className="mt-1 text-xs text-blue-700">
                Es una capa extra de seguridad. Cada vez que inicies sesión, además de tu cuenta Microsoft o Google,
                necesitarás un código de 6 dígitos que genera una app en tu celular.
              </p>
            </div>

            {/* Step 1: Download app */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800">
                Paso 1: Descarga una app de autenticación
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Si no tienes una, descarga cualquiera de estas (son gratuitas):
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">
                  Google Authenticator (Android / iPhone)
                </a>
                <a href="https://www.microsoft.com/en-us/security/mobile-authenticator-app" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">
                  Microsoft Authenticator (Android / iPhone)
                </a>
              </div>
            </div>

            {/* Step 2: Scan QR */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800">
                Paso 2: Escanea este código QR con la app
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Abre la app → toca el botón "+" o "Agregar cuenta" → elige "Escanear código QR" → apunta la cámara aquí:
              </p>
              <div className="mt-3 flex justify-center">
                <img src={mfaSetupData.qrDataUrl} alt="Código QR para MFA" className="h-48 w-48" />
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                  ¿No puedes escanear? Ingresa este código manualmente
                </summary>
                <code className="mt-1 block rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-700 break-all">
                  {mfaSetupData.secret}
                </code>
              </details>
            </div>

            {/* Step 3: Enter code */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800">
                Paso 3: Ingresa el código de 6 dígitos
              </p>
              <p className="mt-1 mb-3 text-xs text-gray-500">
                La app mostrará un número que cambia cada 30 segundos. Escríbelo aquí:
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
              {isLoading ? 'Verificando...' : 'Activar y continuar'}
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

            <button
              type="button"
              onClick={() => googleLogin()}
              disabled={isLoading}
              className={btnClass}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
