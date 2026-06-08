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
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import {
  useApiKeysQuery,
  useApiKeyScopesQuery,
  useCreateApiKey,
  useUpdateApiKey,
  useRotateApiKey,
  useDeleteApiKey,
} from '../../../hooks/queries/useApiKeysQuery';
import type { ApiKey, ApiKeyCreationResult, CreateApiKeyPayload, UpdateApiKeyPayload } from '../../../types/api-key';
import { PageHeader } from '../../../components/ui/PageHeader';

interface KeyFormState {
  name: string;
  permissions: string[];
  buildingIds: string[];
  rateLimitPerMinute: string;
  ingressRateLimitPerMinute: string;
  expiresAt: string;
}

const EMPTY_FORM: KeyFormState = {
  name: '',
  permissions: [],
  buildingIds: [],
  rateLimitPerMinute: '60',
  ingressRateLimitPerMinute: '',
  expiresAt: '',
};

/**
 * Admin page for external API keys (X-API-Key auth on /api/v1/*).
 */
export function ApiKeysPage() {
  const query = useApiKeysQuery();
  const scopesQuery = useApiKeyScopesQuery();
  const buildingsQuery = useBuildingsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canCreate = has('api_keys', 'create');
  const canUpdate = has('api_keys', 'update');

  const createMutation = useCreateApiKey();
  const updateMutation = useUpdateApiKey();
  const rotateMutation = useRotateApiKey();
  const deleteMutation = useDeleteApiKey();

  const allKeys = query.data ?? [];
  const { visible: visibleKeys, hasMore, sentinelRef, total } = useInfiniteScroll(allKeys, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState<ApiKey | null>(null);
  const [rotating, setRotating] = useState<ApiKey | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<KeyFormState>(EMPTY_FORM);

  const scopeOptions = (scopesQuery.data ?? []).map((s) => ({
    value: s.scope,
    label: `${s.label} (${s.scope})`,
  }));

  const buildingOptions = (buildingsQuery.data ?? []).map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const resetForm = () => { setForm(EMPTY_FORM); };

  const openCreate = () => { resetForm(); setCreateOpen(true); };
  const closeCreate = () => { setCreateOpen(false); };

  const openEdit = (key: ApiKey) => {
    setForm({
      name: key.name,
      permissions: [...key.permissions],
      buildingIds: [...key.buildingIds],
      rateLimitPerMinute: String(key.rateLimitPerMinute),
      ingressRateLimitPerMinute: key.ingressRateLimitPerMinute != null
        ? String(key.ingressRateLimitPerMinute)
        : '',
      expiresAt: key.expiresAt ? key.expiresAt.slice(0, 10) : '',
    });
    setEditing(key);
  };

  const closeEdit = () => { setEditing(null); resetForm(); };

  const buildPayloadBase = (): Pick<
    CreateApiKeyPayload,
    'permissions' | 'buildingIds' | 'rateLimitPerMinute' | 'ingressRateLimitPerMinute' | 'expiresAt'
  > => {
    const ingressRaw = form.ingressRateLimitPerMinute.trim();
    return {
      permissions: form.permissions,
      buildingIds: form.buildingIds.length > 0 ? form.buildingIds : undefined,
      rateLimitPerMinute: parseInt(form.rateLimitPerMinute, 10) || 60,
      ingressRateLimitPerMinute: ingressRaw ? parseInt(ingressRaw, 10) : null,
      expiresAt: form.expiresAt || undefined,
    };
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload: CreateApiKeyPayload = {
      name: form.name.trim(),
      ...buildPayloadBase(),
    };

    createMutation.mutate(payload, {
      onSuccess: (result) => {
        closeCreate();
        setCreatedKey(result);
      },
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !form.name.trim()) return;

    const payload: UpdateApiKeyPayload = {
      name: form.name.trim(),
      ...buildPayloadBase(),
    };

    updateMutation.mutate(
      { id: editing.id, payload },
      { onSuccess: () => { closeEdit(); } },
    );
  };

  const handleToggleActive = (key: ApiKey) => {
    updateMutation.mutate({
      id: key.id,
      payload: { isActive: !key.isActive },
    });
  };

  const handleRotate = () => {
    if (!rotating) return;
    rotateMutation.mutate(rotating.id, {
      onSuccess: (result) => {
        setRotating(null);
        setCreatedKey(result);
      },
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  const handleCopy = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => { setCopied(false); }, 2000);
  };

  const scopeCountLabel = (key: ApiKey): string => {
    if (key.buildingIds.length === 0) return 'Todos';
    return `${key.buildingIds.length} edificio(s)`;
  };

  const formFields = (
    <>
      <Field label="Nombre" required>
        <input
          value={form.name}
          onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); }}
          required
          placeholder="Mi integracion"
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Permisos (scopes API v1)">
        {scopesQuery.isLoading ? (
          <p className="text-sm text-muted">Cargando catalogo...</p>
        ) : (
          <CheckboxList
            options={scopeOptions}
            selected={form.permissions}
            onChange={(permissions) => { setForm((f) => ({ ...f, permissions })); }}
          />
        )}
      </Field>

      <Field label="Alcance edificios (vacio = todos)">
        <CheckboxList
          options={buildingOptions}
          selected={form.buildingIds}
          onChange={(buildingIds) => { setForm((f) => ({ ...f, buildingIds })); }}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rate limit general (req/min)">
          <input
            type="number"
            value={form.rateLimitPerMinute}
            onChange={(e) => { setForm((f) => ({ ...f, rateLimitPerMinute: e.target.value })); }}
            min={1}
            max={10000}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Rate limit ingesta (req/min, opcional)">
          <input
            type="number"
            value={form.ingressRateLimitPerMinute}
            onChange={(e) => { setForm((f) => ({ ...f, ingressRateLimitPerMinute: e.target.value })); }}
            min={1}
            max={100000}
            placeholder="Default del tenant"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Fecha de expiracion (opcional)">
        <input
          type="date"
          value={form.expiresAt}
          onChange={(e) => { setForm((f) => ({ ...f, expiresAt: e.target.value })); }}
          min={new Date().toISOString().split('T')[0]}
          className="w-48 rounded-md border border-border px-3 py-2 text-sm"
        />
      </Field>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        eyebrow="Administracion"
        description="Claves para consumir la API externa v1 (header X-API-Key)."
        actions={canCreate ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
          >
            Nueva API Key
          </button>
        ) : undefined}
      />

      <div className="max-h-[70vh] overflow-y-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Nombre</Th>
              <Th>Prefijo</Th>
              <Th>Permisos</Th>
              <Th>Edificios</Th>
              <Th>Rate Limit</Th>
              <Th>Expira</Th>
              <Th>Ultimo Uso</Th>
              <Th>Activa</Th>
              {canUpdate && <Th></Th>}
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={canUpdate ? 9 : 8}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay API keys configuradas."
            skeletonWidths={['w-28', 'w-20', 'w-32', 'w-20', 'w-16', 'w-20', 'w-24', 'w-16', 'w-24']}
          >
            {visibleKeys.map((key) => (
              <tr key={key.id} className="hover:bg-surface">
                <Td className="font-medium text-foreground">{key.name}</Td>
                <Td>
                  <code className="rounded bg-raised px-1.5 py-0.5 text-xs font-mono">{key.keyPrefix}...</code>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {key.permissions.slice(0, 3).map((p) => (
                      <span key={p} className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {p}
                      </span>
                    ))}
                    {key.permissions.length > 3 && (
                      <span className="inline-flex rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-muted">
                        +{key.permissions.length - 3}
                      </span>
                    )}
                  </div>
                </Td>
                <Td className="text-sm text-muted">{scopeCountLabel(key)}</Td>
                <Td>
                  {key.rateLimitPerMinute}/min
                  {key.ingressRateLimitPerMinute != null && (
                    <span className="block text-xs text-muted">
                      ingesta {key.ingressRateLimitPerMinute}/min
                    </span>
                  )}
                </Td>
                <Td>{key.expiresAt ? new Date(key.expiresAt).toLocaleDateString('es-CL') : 'Sin expiracion'}</Td>
                <Td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('es-CL') : 'Nunca'}</Td>
                <Td>
                  <Toggle
                    checked={key.isActive}
                    onChange={() => { handleToggleActive(key); }}
                    size="sm"
                    disabled={!canUpdate}
                  />
                </Td>
                {canUpdate && (
                  <Td>
                    <div className="flex gap-1">
                      <ActionBtn label="Editar" onClick={() => { openEdit(key); }} />
                      <ActionBtn label="Rotar" onClick={() => { setRotating(key); }} />
                      <ActionBtn label="Eliminar" onClick={() => { setDeleting(key); }} variant="danger" />
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && <p className="px-4 py-2 text-xs text-muted">Mostrando {visibleKeys.length} de {total}</p>}

      <Modal open={createOpen} onClose={closeCreate} title="Nueva API Key" dialogClassName="m-auto max-w-xl rounded-lg bg-background p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={handleCreate} className="space-y-4 p-6">
          {formFields}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" type="button" onClick={closeCreate}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={!form.name.trim()}>
              Crear API Key
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={closeEdit} title="Editar API Key" dialogClassName="m-auto max-w-xl rounded-lg bg-background p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={handleUpdate} className="space-y-4 p-6">
          {formFields}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" type="button" onClick={closeEdit}>Cancelar</Button>
            <Button type="submit" loading={updateMutation.isPending} disabled={!form.name.trim()}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!createdKey}
        onClose={() => { setCreatedKey(null); setCopied(false); }}
        title="API Key Generada"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Copia esta clave ahora. No podras verla de nuevo.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-3">
            <code className="flex-1 break-all text-sm font-mono text-foreground">
              {createdKey?.key}
            </code>
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => { setCreatedKey(null); setCopied(false); }}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!rotating}
        onClose={() => { setRotating(null); }}
        onConfirm={handleRotate}
        title="Rotar API Key"
        message={`Rotar la clave "${rotating?.name}"? La clave actual dejara de funcionar inmediatamente.`}
        confirmLabel="Rotar"
        isPending={rotateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar API Key"
        message={`Eliminar "${deleting?.name}"? Esta accion no se puede deshacer.`}
        isPending={deleteMutation.isPending}
      />
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
