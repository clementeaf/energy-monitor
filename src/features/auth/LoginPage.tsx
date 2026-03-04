import { Navigate } from 'react-router';
import { useAuth } from '../../hooks/auth/useAuth';
import { MicrosoftLoginButton } from './components/MicrosoftLoginButton';
import { GoogleLoginButton } from './components/GoogleLoginButton';
import { DemoRoleSelector } from './components/DemoRoleSelector';

export function LoginPage() {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-black">POWER Digital<sup className="text-xs">®</sup></h1>
          <p className="mt-1 text-sm text-[#999]">Plataforma de Monitoreo Energético</p>
        </div>

        {/* Login card */}
        <div className="border border-[#e0e0e0] bg-white p-6">
          <h2 className="mb-4 text-center text-sm font-semibold text-[#666]">Iniciar sesión</h2>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-2">
            <MicrosoftLoginButton />
            <GoogleLoginButton />
          </div>

          {/* Error message */}
          {error && (
            <p className="mt-3 text-center text-xs text-red-600">{error}</p>
          )}

          {/* Loading */}
          {isLoading && (
            <p className="mt-3 text-center text-xs text-[#999]">Conectando...</p>
          )}

          {/* Demo mode */}
          {(import.meta.env.VITE_AUTH_MODE === 'demo' || import.meta.env.DEV) && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 border-t border-[#e0e0e0]" />
                <span className="text-xs text-[#999]">o modo demo</span>
                <div className="flex-1 border-t border-[#e0e0e0]" />
              </div>
              <DemoRoleSelector />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
