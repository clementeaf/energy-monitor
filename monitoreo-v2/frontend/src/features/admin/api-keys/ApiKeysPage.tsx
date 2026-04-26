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
  useApiKeysQuery,
  useCreateApiKey,
  useUpdateApiKey,
  useRotateApiKey,
  useDeleteApiKey,
} from '../../../hooks/queries/useApiKeysQuery';
import type { ApiKey, ApiKeyCreationResult, CreateApiKeyPayload } from '../../../types/api-key';

const AVAILABLE_PERMISSIONS = [
  'readings:read',
  'buildings:read',
  'meters:read',
  'alerts:read',
  'invoices:read',
  'reports:read',
];

export function ApiKeysPage() {
  const query = useApiKeysQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canWrite = has('admin_api_keys', 'create');

  const createMutation = useCreateApiKey();
  const updateMutation = useUpdateApiKey();
  const rotateMutation = useRotateApiKey();
  const deleteMutation = useDeleteApiKey();

  const allKeys = query.data ?? [];
  const { visible: visibleKeys, hasMore, sentinelRef, total } = useInfiniteScroll(allKeys, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<ApiKey | null>(null);
  const [rotating, setRotating] = useState<ApiKey | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formRateLimit, setFormRateLimit] = useState('60');
  const [formExpiry, setFormExpiry] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormPermissions([]);
    setFormRateLimit('60');
    setFormExpiry('');
  };

  const openCreate = () => { resetForm(); setCreateOpen(true); };
  const closeCreate = () => { setCreateOpen(false); };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const payload: CreateApiKeyPayload = {
      name: formName.trim(),
      permissions: formPermissions,
      rateLimitPerMinute: parseInt(formRateLimit, 10) || 60,
      expiresAt: formExpiry || undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: (result) => {
        closeCreate();
        setCreatedKey(result);
      },
    });
  };

  const permissionOptions = AVAILABLE_PERMISSIONS.map((p) => ({ value: p, label: p }));

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
        {canWrite && (
          <Button onClick={openCreate}>Nueva API Key</Button>
        )}
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Prefijo</Th>
              <Th>Permisos</Th>
              <Th>Rate Limit</Th>
              <Th>Expira</Th>
              <Th>Ultimo Uso</Th>
              <Th>Activa</Th>
              {canWrite && <Th></Th>}
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={canWrite ? 8 : 7}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay API keys configuradas."
            skeletonWidths={['w-28', 'w-20', 'w-32', 'w-16', 'w-20', 'w-24', 'w-16', 'w-20']}
          >
            {visibleKeys.map((key) => (
              <tr key={key.id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-900">{key.name}</Td>
                <Td>
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">{key.keyPrefix}...</code>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {key.permissions.slice(0, 3).map((p) => (
                      <span key={p} className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {p}
                      </span>
                    ))}
                    {key.permissions.length > 3 && (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        +{key.permissions.length - 3}
                      </span>
                    )}
                  </div>
                </Td>
                <Td>{key.rateLimitPerMinute}/min</Td>
                <Td>{key.expiresAt ? new Date(key.expiresAt).toLocaleDateString('es-CL') : 'Sin expiracion'}</Td>
                <Td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('es-CL') : 'Nunca'}</Td>
                <Td>
                  <Toggle
                    checked={key.isActive}
                    onChange={() => { handleToggleActive(key); }}
                    size="sm"
                    disabled={!canWrite}
                  />
                </Td>
                {canWrite && (
                  <Td>
                    <div className="flex gap-1">
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
      {total > 0 && <p className="px-4 py-2 text-xs text-pa-text-muted">Mostrando {visibleKeys.length} de {total}</p>}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={closeCreate} title="Nueva API Key" dialogClassName="m-auto max-w-xl rounded-lg bg-white p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Nombre" required>
            <input
              value={formName}
              onChange={(e) => { setFormName(e.target.value); }}
              required
              placeholder="Mi integracion"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Permisos">
            <CheckboxList
              options={permissionOptions}
              selected={formPermissions}
              onChange={setFormPermissions}
            />
          </Field>

          <Field label="Rate Limit (por minuto)">
            <input
              type="number"
              value={formRateLimit}
              onChange={(e) => { setFormRateLimit(e.target.value); }}
              min={1}
              max={10000}
              className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Fecha de Expiracion (opcional)">
            <input
              type="date"
              value={formExpiry}
              onChange={(e) => { setFormExpiry(e.target.value); }}
              min={new Date().toISOString().split('T')[0]}
              className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
            <Button variant="secondary" type="button" onClick={closeCreate}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={!formName.trim()}>
              Crear API Key
            </Button>
          </div>
        </form>
      </Modal>

      {/* Key Display Modal (shown once after creation/rotation) */}
      <Modal
        open={!!createdKey}
        onClose={() => { setCreatedKey(null); setCopied(false); }}
        title="API Key Generada"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Copia esta clave ahora. No podras verla de nuevo.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
            <code className="flex-1 break-all text-sm font-mono text-gray-900">
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

      {/* Rotate Confirm */}
      <ConfirmDialog
        open={!!rotating}
        onClose={() => { setRotating(null); }}
        onConfirm={handleRotate}
        title="Rotar API Key"
        message={`Rotar la clave "${rotating?.name}"? La clave actual dejara de funcionar inmediatamente.`}
        confirmLabel="Rotar"
        isPending={rotateMutation.isPending}
      />

      {/* Delete Confirm */}
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
      <span className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
