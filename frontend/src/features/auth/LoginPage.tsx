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
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text">POWER Digital<sup className="text-xs">®</sup></h1>
          <p className="mt-1 text-sm text-subtle">Plataforma de Monitoreo Energético</p>
        </div>

        {/* Login card */}
        <div className="border border-border bg-surface p-6">
          <h2 className="mb-4 text-center text-sm font-semibold text-muted">Iniciar sesión</h2>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-2">
            <MicrosoftLoginButton />
            <GoogleLoginButton />
          </div>

          {/* Error message */}
          {error && (
            <p className="mt-3 text-center text-xs text-red-400">{error}</p>
          )}

          {/* Loading */}
          {isLoading && (
            <p className="mt-3 text-center text-xs text-subtle">Conectando...</p>
          )}

          {/* Demo mode */}
          {import.meta.env.VITE_AUTH_MODE === 'demo' && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-subtle">o modo demo</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <DemoRoleSelector />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
