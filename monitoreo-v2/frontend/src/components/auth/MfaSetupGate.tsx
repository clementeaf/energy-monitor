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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-gray-900">Configuración MFA Requerida</h2>
        <p className="mt-2 text-sm text-gray-600">
          Tu rol requiere autenticación de dos factores (MFA) para acceder a la plataforma.
          Configura MFA en tu perfil para continuar.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          Este requisito es parte de las medidas de seguridad conforme a la Ley 21.719 de Protección de Datos Personales.
        </p>

        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.profile)}
          className="mt-6 w-full rounded-lg bg-[var(--color-primary,#3D3BF3)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Ir a Mi Perfil
        </button>
      </div>
    </div>
  );
}
