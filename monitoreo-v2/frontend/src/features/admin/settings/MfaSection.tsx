import { useState, type ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authEndpoints } from '../../../services/endpoints';
import type { MfaSetupResponse } from '../../../services/endpoints';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

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

  const verifyMutation = useMutation({
    mutationFn: (code: string) => authEndpoints.mfaVerify(code).then((r) => r.data),
    onSuccess: () => {
      setSetupData(null);
      setVerifyCode('');
      setVerifyError(null);
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
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
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Autenticación de dos factores (MFA)</h2>
      <p className="mt-1 text-sm text-gray-500">
        Agrega una capa adicional de seguridad a tu cuenta usando una app de autenticación (Google Authenticator, Authy, etc.).
      </p>

      <div className="mt-4">
        {statusQuery.isPending && (
          <p className="text-sm text-gray-400">Verificando estado MFA...</p>
        )}

        {/* MFA enabled — show status + disable */}
        {mfaEnabled && !setupData && (
          <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
            <div>
              <p className="font-medium text-green-800">MFA habilitado</p>
              <p className="text-sm text-green-600">Tu cuenta está protegida con segundo factor.</p>
            </div>
            <button
              type="button"
              onClick={() => setDisableOpen(true)}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
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
            className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {setupMutation.isPending ? 'Generando...' : 'Configurar MFA'}
          </button>
        )}

        {/* Setup flow — QR code + verify */}
        {setupData && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-3 text-sm font-medium text-gray-700">
                1. Escanea este código QR con tu app de autenticación:
              </p>
              <div className="flex justify-center">
                <img src={setupData.qrDataUrl} alt="MFA QR Code" className="h-48 w-48" />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Si no puedes escanear, ingresa este código manualmente: <code className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs">{setupData.secret}</code>
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
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
                  className="w-32 rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-widest"
                />
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifyMutation.isPending}
                  className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {verifyMutation.isPending ? 'Verificando...' : 'Verificar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSetupData(null); setVerifyCode(''); setVerifyError(null); }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
              {verifyError && <p className="mt-1 text-sm text-red-600">{verifyError}</p>}
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
    </div>
  );
}
