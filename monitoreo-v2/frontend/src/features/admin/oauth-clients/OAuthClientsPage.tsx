import { useState } from 'react';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Button } from '../../../components/ui/Button';
import { Toggle } from '../../../components/ui/Toggle';
import { CheckboxList } from '../../../components/ui/CheckboxList';
import { Th, Td, ActionBtn } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  useOAuthClientsQuery,
  useCreateOAuthClient,
  useUpdateOAuthClient,
  useRotateOAuthClient,
  useDeleteOAuthClient,
} from '../../../hooks/queries/useOAuthClientsQuery';
import type {
  OAuthClient,
  OAuthClientCreationResult,
  CreateOAuthClientPayload,
} from '../../../types/oauth-client';
import { OAUTH_SCOPES } from '../../../types/oauth-client';
import {
  READINGS_EXPORT_CONTRACT_DEFAULT,
  READINGS_EXPORT_CONTRACT_HEADER,
} from '../../../types/data-governance';
import { PageHeader } from '../../../components/ui/PageHeader';

const SCOPE_OPTIONS = OAUTH_SCOPES.map((scope) => ({ value: scope, label: scope }));

/**
 * Admin page for OAuth2 client_credentials clients (machine-to-machine API access).
 */
export function OAuthClientsPage() {
  const query = useOAuthClientsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canWrite = has('oauth_clients', 'create');

  const createMutation = useCreateOAuthClient();
  const updateMutation = useUpdateOAuthClient();
  const rotateMutation = useRotateOAuthClient();
  const deleteMutation = useDeleteOAuthClient();

  const allClients = query.data ?? [];
  const { visible: visibleClients, hasMore, sentinelRef, total } = useInfiniteScroll(allClients, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<OAuthClient | null>(null);
  const [rotating, setRotating] = useState<OAuthClient | null>(null);
  const [createdClient, setCreatedClient] = useState<OAuthClientCreationResult | null>(null);
  const [copiedField, setCopiedField] = useState<'id' | 'secret' | null>(null);

  const [formName, setFormName] = useState('');
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [formTtl, setFormTtl] = useState('3600');

  const resetForm = () => {
    setFormName('');
    setFormScopes([]);
    setFormTtl('3600');
  };

  const openCreate = () => { resetForm(); setCreateOpen(true); };
  const closeCreate = () => { setCreateOpen(false); };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const payload: CreateOAuthClientPayload = {
      name: formName.trim(),
      scopes: formScopes,
      tokenTtlSeconds: parseInt(formTtl, 10) || 3600,
    };

    createMutation.mutate(payload, {
      onSuccess: (result) => {
        closeCreate();
        setCreatedClient(result);
      },
    });
  };

  const handleToggleActive = (client: OAuthClient) => {
    updateMutation.mutate({
      id: client.id,
      payload: { isActive: !client.isActive },
    });
  };

  const handleRotate = () => {
    if (!rotating) return;
    rotateMutation.mutate(rotating.id, {
      onSuccess: (result) => {
        setRotating(null);
        setCreatedClient(result);
      },
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  const handleCopy = (field: 'id' | 'secret', value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => { setCopiedField(null); }, 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="OAuth Clients"
        eyebrow="Administración"
        actions={canWrite ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
          >
            Nuevo Cliente OAuth
          </button>
        ) : undefined}
      />

      <p className="text-sm text-muted">
        Clientes OAuth2 con flujo <code className="text-xs">client_credentials</code> para integraciones M2M.
        Obtén tokens via <code className="text-xs">POST /oauth/token</code>.
      </p>

      <div className="rounded-lg border border-border bg-surface p-4 text-sm">
        <p className="font-medium text-foreground">Export ETL — contrato de datos</p>
        <p className="mt-1 text-muted">
          Incluya el header{' '}
          <code className="rounded bg-raised px-1 font-mono text-xs">{READINGS_EXPORT_CONTRACT_HEADER}</code>
          {' '}= <code className="rounded bg-raised px-1 font-mono text-xs">{READINGS_EXPORT_CONTRACT_DEFAULT}</code>
          {' '}en <code className="text-xs">GET /v1/readings/export</code>.
          Scope requerido: <code className="text-xs">readings:export</code>.
        </p>
      </div>

      <div className="max-h-[70vh] overflow-y-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Nombre</Th>
              <Th>Client ID</Th>
              <Th>Scopes</Th>
              <Th>TTL (s)</Th>
              <Th>Ultimo Uso</Th>
              <Th>Activo</Th>
              {canWrite && <Th></Th>}
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={canWrite ? 7 : 6}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay clientes OAuth configurados."
            skeletonWidths={['w-28', 'w-24', 'w-32', 'w-16', 'w-24', 'w-16', 'w-20']}
          >
            {visibleClients.map((client) => (
              <tr key={client.id} className="hover:bg-surface">
                <Td className="font-medium text-foreground">{client.name}</Td>
                <Td>
                  <code className="rounded bg-raised px-1.5 py-0.5 text-xs font-mono">
                    {client.clientIdPrefix}...
                  </code>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {client.scopes.slice(0, 3).map((scope) => (
                      <span key={scope} className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {scope}
                      </span>
                    ))}
                    {client.scopes.length > 3 && (
                      <span className="inline-flex rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-muted">
                        +{client.scopes.length - 3}
                      </span>
                    )}
                  </div>
                </Td>
                <Td>{client.tokenTtlSeconds}</Td>
                <Td>{client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString('es-CL') : 'Nunca'}</Td>
                <Td>
                  <Toggle
                    checked={client.isActive}
                    onChange={() => { handleToggleActive(client); }}
                    size="sm"
                    disabled={!canWrite}
                  />
                </Td>
                {canWrite && (
                  <Td>
                    <div className="flex gap-1">
                      <ActionBtn label="Rotar" onClick={() => { setRotating(client); }} />
                      <ActionBtn label="Eliminar" onClick={() => { setDeleting(client); }} variant="danger" />
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && <p className="px-4 py-2 text-xs text-muted">Mostrando {visibleClients.length} de {total}</p>}

      <Modal open={createOpen} onClose={closeCreate} title="Nuevo Cliente OAuth" dialogClassName="m-auto max-w-xl rounded-lg bg-background p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Nombre" required>
            <input
              value={formName}
              onChange={(e) => { setFormName(e.target.value); }}
              required
              placeholder="Integracion ERP"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Scopes">
            <CheckboxList
              options={SCOPE_OPTIONS}
              selected={formScopes}
              onChange={setFormScopes}
            />
          </Field>

          <Field label="Token TTL (segundos)">
            <input
              type="number"
              value={formTtl}
              onChange={(e) => { setFormTtl(e.target.value); }}
              min={300}
              max={86400}
              className="w-32 rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" type="button" onClick={closeCreate}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={!formName.trim()}>
              Crear Cliente
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!createdClient}
        onClose={() => { setCreatedClient(null); setCopiedField(null); }}
        title="Credenciales OAuth Generadas"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Copia estas credenciales ahora. El secret no se mostrara de nuevo.
          </p>
          <CredentialRow
            label="Client ID"
            value={createdClient?.clientId ?? ''}
            copied={copiedField === 'id'}
            onCopy={() => handleCopy('id', createdClient?.clientId ?? '')}
          />
          <CredentialRow
            label="Client Secret"
            value={createdClient?.clientSecret ?? ''}
            copied={copiedField === 'secret'}
            onCopy={() => handleCopy('secret', createdClient?.clientSecret ?? '')}
          />
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => { setCreatedClient(null); setCopiedField(null); }}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!rotating}
        onClose={() => { setRotating(null); }}
        onConfirm={handleRotate}
        title="Rotar Client Secret"
        message={`Rotar el secret de "${rotating?.name}"? El secret actual dejara de funcionar inmediatamente.`}
        confirmLabel="Rotar"
        isPending={rotateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar Cliente OAuth"
        message={`Eliminar "${deleting?.name}"? Esta accion no se puede deshacer.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
}: Readonly<{
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}>) {
  return (
    <div>
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-surface p-3">
        <code className="flex-1 break-all text-sm font-mono text-foreground">{value}</code>
        <Button size="sm" variant="secondary" onClick={onCopy}>
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
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
