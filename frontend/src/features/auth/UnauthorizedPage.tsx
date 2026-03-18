import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/auth/useAuth';

export function UnauthorizedPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-pa-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg className="h-6 w-6 text-pa-coral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-pa-navy">Sin acceso</h1>
        <p className="mt-2 text-sm text-pa-text-muted">
          No tienes permisos para acceder a esta sección.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl bg-pa-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pa-blue-light"
          >
            Ir al inicio
          </button>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-pa-text-muted transition-colors hover:text-pa-coral"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
