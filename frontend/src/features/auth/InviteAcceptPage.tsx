import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router';
import { useInvitation } from '../../hooks/queries/useAdminUsers';
import { useAuth } from '../../hooks/auth/useAuth';
import { MicrosoftLoginButton } from './components/MicrosoftLoginButton';
import { GoogleLoginButton } from './components/GoogleLoginButton';

const INVITATION_TOKEN_KEY = 'invitation_token';

function invitationStatusMessage(status: 'invited' | 'active' | 'disabled' | 'expired') {
  if (status === 'active') {
    return 'Esta invitación ya fue utilizada. Puedes iniciar sesión normalmente con la cuenta ya vinculada.';
  }

  if (status === 'disabled') {
    return 'Esta invitación fue deshabilitada por un administrador.';
  }

  if (status === 'expired') {
    return 'Esta invitación expiró. Solicita una nueva invitación al administrador.';
  }

  return 'Continúa con la cuenta invitada para activar el acceso asignado.';
}

export function InviteAcceptPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useInvitation(token);

  useEffect(() => {
    if (data?.invitationStatus === 'invited' && token) {
      sessionStorage.setItem(INVITATION_TOKEN_KEY, token);
      return;
    }

    sessionStorage.removeItem(INVITATION_TOKEN_KEY);
  }, [data?.invitationStatus, token]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="w-full max-w-md border border-border bg-surface p-6">
        <h1 className="mb-2 text-center text-xl font-semibold text-text">Invitación de acceso</h1>

        {isLoading && (
          <p className="text-center text-sm text-subtle">Validando invitación...</p>
        )}

        {!isLoading && isError && (
          <p className="text-center text-sm text-red-400">
            El link de invitación es inválido o ya no está disponible.
          </p>
        )}

        {!isLoading && data && (
          <div className="space-y-4">
            <div className="space-y-1 text-sm text-muted">
              <p><span className="text-subtle">Invitado:</span> <span className="text-text">{data.name}</span></p>
              <p><span className="text-subtle">Email:</span> <span className="text-text">{data.email}</span></p>
              <p><span className="text-subtle">Rol:</span> <span className="text-text">{data.roleLabel}</span></p>
              {data.invitationExpiresAt && (
                <p><span className="text-subtle">Expira:</span> <span className="text-text">{new Date(data.invitationExpiresAt).toLocaleString('es-CL')}</span></p>
              )}
            </div>

            <p className="text-sm text-muted">{invitationStatusMessage(data.invitationStatus)}</p>

            {(data.invitationStatus === 'invited' || data.invitationStatus === 'active') && (
              <div className="flex flex-col gap-2">
                <MicrosoftLoginButton />
                <GoogleLoginButton />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}