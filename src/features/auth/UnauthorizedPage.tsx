import { useNavigate } from 'react-router';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-lg font-bold text-text">Acceso denegado</h1>
        <p className="mt-2 text-sm text-muted">
          No tienes permiso para acceder a esta sección.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 border border-border px-4 py-2 text-sm text-text transition-colors hover:bg-raised"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
