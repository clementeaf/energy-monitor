import { useState, type ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startRegistration } from '@simplewebauthn/browser';
import { authEndpoints } from '../../../services/endpoints';
import type { MfaSetupResponse } from '../../../services/endpoints';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useAuthStore } from '../../../store/useAuthStore';
import { applyTenantTheme } from '../../../lib/tenant-theme';

/**
 * MFA setup/disable section for user settings.
 * Shows QR code for setup, verification input, and disable toggle.
 */
export function MfaSection(): ReactElement {
  const queryClient = useQueryClient();
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['mfa', 'status'],
    queryFn: () => authEndpoints.mfaStatus().then((r) => r.data),
  });

  const setupMutation = useMutation({
    mutationFn: () => authEndpoints.mfaSetup().then((r) => r.data),
    onSuccess: (data) => setSetupData(data),
  });

  const refreshSession = async () => {
    try {
      const { data } = await authEndpoints.me();
      const { buildings, ...usr } = data.user;
      const { setSession } = useAuthStore.getState();
      setSession(usr, data.tenant, buildings ?? []);
      applyTenantTheme(data.tenant);
    } catch { /* ignore — next page load will refresh */ }
  };

  const verifyMutation = useMutation({
    mutationFn: (code: string) => authEndpoints.mfaVerify(code).then((r) => r.data),
    onSuccess: () => {
      setSetupData(null);
      setVerifyCode('');
      setVerifyError(null);
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
      // Refresh session so requireMfaSetup flag updates (lifts MfaSetupGate)
      refreshSession();
    },
    onError: () => setVerifyError('Código inválido. Intente de nuevo.'),
  });

  const disableMutation = useMutation({
    mutationFn: () => authEndpoints.mfaDisable().then((r) => r.data),
    onSuccess: () => {
      setDisableOpen(false);
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
    },
  });

  const mfaEnabled = statusQuery.data?.mfaEnabled ?? false;

  const handleVerify = () => {
    if (verifyCode.length !== 6) {
      setVerifyError('Ingrese un código de 6 dígitos.');
      return;
    }
    setVerifyError(null);
    verifyMutation.mutate(verifyCode);
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h2 className="text-lg font-semibold text-foreground">Autenticación de dos factores (MFA)</h2>
      <p className="mt-1 text-sm text-muted">
        Agrega una capa adicional de seguridad a tu cuenta usando una app de autenticación (Google Authenticator, Authy, etc.).
      </p>

      <div className="mt-4">
        {statusQuery.isPending && (
          <p className="text-sm text-subtle">Verificando estado MFA...</p>
        )}

        {/* MFA enabled — show status + disable */}
        {mfaEnabled && !setupData && (
          <div className="flex items-center justify-between rounded-lg bg-success/10 p-4">
            <div>
              <p className="font-medium text-success">MFA habilitado</p>
              <p className="text-sm text-success">Tu cuenta está protegida con segundo factor.</p>
            </div>
            <button
              type="button"
              onClick={() => setDisableOpen(true)}
              className="rounded-md border border-danger/50 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            >
              Desactivar
            </button>
          </div>
        )}

        {/* MFA not enabled — show setup button */}
        {!mfaEnabled && !setupData && !statusQuery.isPending && (
          <button
            type="button"
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
          >
            {setupMutation.isPending ? 'Generando...' : 'Configurar MFA'}
          </button>
        )}

        {/* Setup flow — QR code + verify */}
        {setupData && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                1. Escanea este código QR con tu app de autenticación:
              </p>
              <div className="flex justify-center">
                <img src={setupData.qrDataUrl} alt="MFA QR Code" className="h-48 w-48" />
              </div>
              <p className="mt-3 text-xs text-muted">
                Si no puedes escanear, ingresa este código manualmente: <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs">{setupData.secret}</code>
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                2. Ingresa el código de 6 dígitos que muestra la app:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-32 rounded-md border border-border px-3 py-2 text-center font-mono text-lg tracking-widest"
                />
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifyMutation.isPending}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
                >
                  {verifyMutation.isPending ? 'Verificando...' : 'Verificar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSetupData(null); setVerifyCode(''); setVerifyError(null); }}
                  className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface"
                >
                  Cancelar
                </button>
              </div>
              {verifyError && <p className="mt-1 text-sm text-danger">{verifyError}</p>}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        onConfirm={() => disableMutation.mutate()}
        title="Desactivar MFA"
        message="¿Desactivar la autenticación de dos factores? Tu cuenta será menos segura."
        isPending={disableMutation.isPending}
      />

      <PasskeySection />
    </div>
  );
}

function PasskeySection() {
  const queryClient = useQueryClient();
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const credentialsQuery = useQuery({
    queryKey: ['webauthn', 'credentials'],
    queryFn: () => authEndpoints.webauthnCredentials().then((r) => r.data),
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const options = (await authEndpoints.webauthnRegisterOptions()).data;
      const attestation = await startRegistration({ optionsJSON: options });
      await authEndpoints.webauthnRegisterVerify(attestation, deviceName || undefined);
    },
    onSuccess: () => {
      setDeviceName('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['webauthn', 'credentials'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authEndpoints.webauthnDeleteCredential(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webauthn', 'credentials'] }),
  });

  const credentials = credentialsQuery.data ?? [];

  return (
    <div className="mt-6 border-t border-border pt-6">
      <h2 className="text-lg font-semibold text-foreground">Passkeys (biométrico)</h2>
      <p className="mt-1 text-sm text-muted">
        Usa tu huella, rostro o llave de seguridad para iniciar sesión sin códigos.
      </p>

      <div className="mt-4 space-y-3">
        {credentials.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{c.device_name ?? 'Passkey'}</p>
              <p className="text-xs text-muted">Registrada {new Date(c.created_at).toLocaleDateString('es-CL')}</p>
            </div>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(c.id)}
              disabled={deleteMutation.isPending}
              className="text-xs text-danger hover:underline disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Nombre del dispositivo (opcional)"
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button
            type="button"
            onClick={() => registerMutation.mutate()}
            disabled={registerMutation.isPending}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
          >
            {registerMutation.isPending ? 'Registrando...' : 'Registrar passkey'}
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
