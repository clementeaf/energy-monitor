import { useNavigate } from 'react-router';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-lg font-bold text-black">Acceso denegado</h1>
        <p className="mt-2 text-sm text-[#666]">
          No tienes permiso para acceder a esta sección.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 border border-[#e0e0e0] px-4 py-2 text-sm text-black transition-colors hover:bg-[#e0e0e0]"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
