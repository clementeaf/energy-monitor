import { useNavigate } from 'react-router';
import { APP_ROUTES } from '../../app/routes';

/**
 * Blocking banner shown when user's role requires MFA but it's not configured.
 * Redirects to /profile where MFA setup is available to ALL users.
 */
export function MfaSetupGate() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-gray-900">Configura la verificación en dos pasos</h2>
        <p className="mt-2 text-sm text-gray-600">
          Para acceder a la plataforma, necesitas activar la verificación en dos pasos (MFA).
          Es un proceso de un solo minuto:
        </p>

        <ol className="mt-3 space-y-1.5 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">1</span>
            <span>Descarga <strong>Google Authenticator</strong> o <strong>Microsoft Authenticator</strong> en tu celular</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">2</span>
            <span>Escanea un código QR que te mostraremos</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">3</span>
            <span>Ingresa el código de 6 dígitos que genera la app</span>
          </li>
        </ol>

        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.profile)}
          className="mt-6 w-full rounded-lg bg-[var(--color-primary,#3D3BF3)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Configurar ahora
        </button>
      </div>
    </div>
  );
}
