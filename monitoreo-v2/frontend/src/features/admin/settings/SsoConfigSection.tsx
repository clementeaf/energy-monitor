import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  useTenantSsoConfigQuery,
  useUpsertTenantSsoConfig,
} from '../../../hooks/queries/useTenantSsoQuery';
import type { UpsertTenantSsoPayload } from '../../../types/sso';

interface SsoConfigSectionProps {
  tenantId: string | undefined;
}

/**
 * Admin panel for tenant OIDC SSO configuration (issuer, client credentials, SCIM secret).
 */
export function SsoConfigSection({ tenantId }: Readonly<SsoConfigSectionProps>) {
  const { has } = usePermissions();
  const canRead = has('sso', 'read');
  const canWrite = has('sso', 'update');

  const configQuery = useTenantSsoConfigQuery(canRead ? tenantId : undefined);
  const upsertMutation = useUpsertTenantSsoConfig(tenantId);

  const [issuer, setIssuer] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [scimWebhookSecret, setScimWebhookSecret] = useState('');
  const [saved, setSaved] = useState(false);

  const config = configQuery.data;

  useEffect(() => {
    if (!config) return;
    setIssuer(config.issuer);
    setClientId(config.clientId);
    setMetadataUrl(config.metadataUrl ?? '');
    setClientSecret('');
    setScimWebhookSecret('');
  }, [config]);

  if (!canRead) return null;

  const handleSave = () => {
    if (!issuer.trim() || !clientId.trim() || !clientSecret.trim()) return;

    const payload: UpsertTenantSsoPayload = {
      issuer: issuer.trim(),
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      metadataUrl: metadataUrl.trim() || null,
      scimWebhookSecret: scimWebhookSecret.trim() || null,
    };

    upsertMutation.mutate(payload, {
      onSuccess: () => {
        setClientSecret('');
        setScimWebhookSecret('');
        setSaved(true);
        setTimeout(() => { setSaved(false); }, 2000);
      },
    });
  };

  return (
    <div className="max-w-2xl space-y-4 panel p-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">SSO Enterprise (OIDC)</h2>
        <p className="mt-1 text-xs text-subtle">
          Configura el proveedor OIDC. Activa el proveedor en la sección Seguridad antes de guardar aquí.
        </p>
      </div>

      {configQuery.isLoading && (
        <p className="text-sm text-muted">Cargando configuracion SSO...</p>
      )}

      {configQuery.isError && (
        <p className="text-sm text-danger">No se pudo cargar la configuracion SSO.</p>
      )}

      {!configQuery.isLoading && (
        <div className="space-y-3">
          {config ? (
            <p className="rounded-md bg-surface px-3 py-2 text-xs text-muted">
              Configuracion existente (actualizada {new Date(config.updatedAt).toLocaleString('es-CL')}).
              {config.hasClientSecret && ' Client secret configurado.'}
              {config.hasScimWebhookSecret && ' SCIM webhook configurado.'}
            </p>
          ) : (
            <p className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted">
              Sin configuracion OIDC. Completa los campos para habilitar SSO.
            </p>
          )}

          <Field label="Issuer (URL del IdP)" required>
            <input
              value={issuer}
              onChange={(e) => { setIssuer(e.target.value); }}
              disabled={!canWrite}
              placeholder="https://login.microsoftonline.com/{tenant}/v2.0"
              className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
            />
          </Field>

          <Field label="Client ID" required>
            <input
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); }}
              disabled={!canWrite}
              className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
            />
          </Field>

          <Field label="Client Secret" required>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => { setClientSecret(e.target.value); }}
              disabled={!canWrite}
              autoComplete="new-password"
              placeholder={config?.hasClientSecret ? 'Reingresar secret para actualizar' : ''}
              className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
            />
          </Field>

          <Field label="Metadata URL (opcional)">
            <input
              type="url"
              value={metadataUrl}
              onChange={(e) => { setMetadataUrl(e.target.value); }}
              disabled={!canWrite}
              placeholder="https://..."
              className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
            />
          </Field>

          <Field label="SCIM Webhook Secret (opcional)">
            <input
              type="password"
              value={scimWebhookSecret}
              onChange={(e) => { setScimWebhookSecret(e.target.value); }}
              disabled={!canWrite}
              placeholder={config?.hasScimWebhookSecret ? 'Dejar vacio para mantener' : ''}
              autoComplete="new-password"
              className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
            />
          </Field>

          {canWrite && (
            <div className="flex items-center gap-3 border-t border-border pt-4">
              <Button
                onClick={handleSave}
                loading={upsertMutation.isPending}
                disabled={!issuer.trim() || !clientId.trim() || !clientSecret.trim()}
              >
                Guardar SSO
              </Button>
              {saved && (
                <span className="text-sm font-medium text-green-600">Guardado correctamente</span>
              )}
              {upsertMutation.isError && (
                <span className="text-sm text-red-600">Error al guardar SSO.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
