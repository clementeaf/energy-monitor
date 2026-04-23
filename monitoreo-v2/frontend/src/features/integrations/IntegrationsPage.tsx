import { useState } from 'react';
import { isAxiosError } from 'axios';
import { DataWidget } from '../../components/ui/DataWidget';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQueryState } from '../../hooks/useQueryState';
import { usePermissions } from '../../hooks/usePermissions';
import {
  useIntegrationsQuery,
  useIntegrationSyncLogsQuery,
  useCreateIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
  useTriggerIntegrationSync,
} from '../../hooks/queries/useIntegrationsQuery';
import type {
  Integration,
  IntegrationStatus,
  IntegrationSyncLog,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
  IntegrationQueryParams,
} from '../../types/integration';

const STATUS_OPTIONS: { value: IntegrationStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'error', label: 'Error' },
  { value: 'pending', label: 'Pendiente' },
];

const SYNC_STATUS_LABELS: Record<IntegrationSyncLog['status'], string> = {
  success: 'Correcto',
  partial: 'Parcial',
  failed: 'Fallido',
};

/**
 * Type guard: plain object (not array) for JSON `config` payloads.
 * @param value - Parsed JSON value
 */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validates and parses JSON config as a plain object for API payloads.
 * @param raw - User-entered JSON string
 * @returns Record for `config` field
 */
function parseConfigObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return {};
  }
  const parsed: unknown = JSON.parse(trimmed);
  if (!isPlainRecord(parsed)) {
    throw new Error('La configuracion debe ser un objeto JSON (no un array ni un valor simple).');
  }
  return parsed;
}

/**
 * Returns the Spanish label for an integration status value.
 * @param s - Status enum value
 */
function labelStatus(s: IntegrationStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

/**
 * Normalizes API or runtime errors to a single message string.
 * @param err - Thrown value from mutation or parse
 */
function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (data?.message != null) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
  }
  if (err instanceof Error) return err.message;
  return 'Error desconocido';
}

export function IntegrationsPage() {
  const { has } = usePermissions();
  const canRead = has('integrations', 'read');
  const canCreate = has('integrations', 'create');
  const canUpdate = has('integrations', 'update');

  const [filters, setFilters] = useState<IntegrationQueryParams>({});
  const listQuery = useIntegrationsQuery(filters, { enabled: canRead });
  const qs = useQueryState(listQuery, {
    isEmpty: (d) => d === undefined || d.length === 0,
  });

  const createMutation = useCreateIntegration();
  const updateMutation = useUpdateIntegration();
  const deleteMutation = useDeleteIntegration();
  const syncMutation = useTriggerIntegrationSync();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [deleting, setDeleting] = useState<Integration | null>(null);

  const [name, setName] = useState('');
  const [integrationType, setIntegrationType] = useState('');
  const [status, setStatus] = useState<IntegrationStatus>('active');
  const [configText, setConfigText] = useState('{}');
  const [formError, setFormError] = useState<string | null>(null);

  const [logsFor, setLogsFor] = useState<Integration | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const logsLimit = 20;
  const syncLogsQuery = useIntegrationSyncLogsQuery(
    logsFor?.id ?? null,
    { page: logsPage, limit: logsLimit },
    { enabled: canRead && logsFor != null },
  );

  const openCreate = (): void => {
    setEditing(null);
    setName('');
    setIntegrationType('');
    setStatus('active');
    setConfigText('{}');
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (row: Integration): void => {
    setEditing(row);
    setName(row.name);
    setIntegrationType(row.integrationType);
    setStatus(row.status);
    setConfigText(JSON.stringify(row.config ?? {}, null, 2));
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = (): void => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const submitForm = (): void => {
    setFormError(null);
    let config: Record<string, unknown>;
    try {
      config = parseConfigObject(configText);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'JSON invalido');
      return;
    }

    if (editing) {
      const payload: UpdateIntegrationPayload = {
        name,
        integrationType,
        status,
        config,
      };
      updateMutation.mutate(
        { id: editing.id, payload },
        {
          onSuccess: closeForm,
          onError: (err) => {
            setFormError(errorMessage(err));
          },
        },
      );
    } else {
      const payload: CreateIntegrationPayload = {
        name,
        integrationType,
        status,
        config,
      };
      createMutation.mutate(payload, {
        onSuccess: closeForm,
        onError: (err) => {
          setFormError(errorMessage(err));
        },
      });
    }
  };

  const openLogs = (row: Integration): void => {
    setLogsFor(row);
    setLogsPage(1);
  };

  const closeLogs = (): void => {
    setLogsFor(null);
  };

  const logsTotalPages =
    syncLogsQuery.data != null
      ? Math.max(1, Math.ceil(syncLogsQuery.data.total / logsLimit))
      : 1;

  return (
    <div className="flex h-full flex-col gap-6">
      {!canRead ? (
        <div className="flex flex-1 items-center justify-center text-gray-500">
          No tiene permisos para ver integraciones.
        </div>
      ) : (
        <>
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">Integraciones</h1>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Filtrar por tipo"
                  value={filters.integrationType ?? ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      integrationType: e.target.value || undefined,
                    })
                  }
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                />
                <select
                  value={filters.status ?? ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      status:
                        e.target.value === ''
                          ? undefined
                          : (e.target.value as IntegrationStatus),
                    })
                  }
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="">Todos los estados</option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {canCreate && (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Nueva integracion
                  </button>
                )}
              </div>
            </div>

            <DataWidget
              phase={qs.phase}
              error={qs.error}
              onRetry={() => {
                listQuery.refetch();
              }}
              emptyDescription="No hay integraciones configuradas"
            >
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Ultima sync</th>
                      <th className="px-4 py-3">Error</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listQuery.data?.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                        <td className="px-4 py-3 text-gray-700">{row.integrationType}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                            {labelStatus(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.lastSyncAt
                            ? new Date(row.lastSyncAt).toLocaleString('es-CL')
                            : '—'}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-500" title={row.errorMessage ?? undefined}>
                          {row.errorMessage ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              openLogs(row);
                            }}
                            className="mr-2 text-sm font-medium text-[var(--color-primary,#3D3BF3)] hover:underline"
                          >
                            Historial
                          </button>
                          {canUpdate && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  syncMutation.mutateAsync(row.id).catch(() => undefined);
                                }}
                                disabled={syncMutation.isPending}
                                className="mr-2 text-sm font-medium text-gray-800 hover:underline disabled:opacity-50"
                              >
                                Sincronizar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  openEdit(row);
                                }}
                                className="mr-2 text-sm font-medium text-gray-800 hover:underline"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleting(row);
                                }}
                                className="text-sm text-red-600 hover:underline"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataWidget>
          </section>

          <Modal
            open={formOpen}
            onClose={closeForm}
            title={editing ? 'Editar integracion' : 'Nueva integracion'}
            dialogClassName="m-auto max-w-2xl rounded-lg bg-white p-0 shadow-xl backdrop:bg-black/40"
          >
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Nombre
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de integracion
                <input
                  value={integrationType}
                  onChange={(e) => {
                    setIntegrationType(e.target.value);
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="p. ej. api_rest, datalake"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Estado
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as IntegrationStatus);
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Configuracion (JSON)
                <textarea
                  value={configText}
                  onChange={(e) => {
                    setConfigText(e.target.value);
                  }}
                  rows={10}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
                  spellCheck={false}
                />
              </label>
              {formError != null && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitForm}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            open={logsFor != null}
            onClose={closeLogs}
            title={logsFor ? `Historial: ${logsFor.name}` : 'Historial'}
            dialogClassName="m-auto max-w-4xl rounded-lg bg-white p-0 shadow-xl backdrop:bg-black/40"
          >
            {logsFor != null && (
              <SyncLogsPanel
                query={syncLogsQuery}
                logsPage={logsPage}
                logsLimit={logsLimit}
                logsTotalPages={logsTotalPages}
                onPageChange={setLogsPage}
              />
            )}
          </Modal>

          <ConfirmDialog
            open={deleting != null}
            onClose={() => {
              setDeleting(null);
            }}
            onConfirm={() => {
              if (!deleting) return;
              deleteMutation.mutate(deleting.id, {
                onSuccess: () => {
                  setDeleting(null);
                },
              });
            }}
            title="Eliminar integracion"
            message={`Eliminar "${deleting?.name}"? Esta accion no se puede deshacer.`}
            isPending={deleteMutation.isPending}
          />
        </>
      )}
    </div>
  );
}

interface SyncLogsPanelProps {
  query: ReturnType<typeof useIntegrationSyncLogsQuery>;
  logsPage: number;
  logsLimit: number;
  logsTotalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Renders paginated sync log rows with loading and error states.
 */
function SyncLogsPanel({
  query,
  logsPage,
  logsLimit,
  logsTotalPages,
  onPageChange,
}: Readonly<SyncLogsPanelProps>) {
  const qs = useQueryState(query, {
    isEmpty: (d) => d === undefined || d.items.length === 0,
  });

  return (
    <DataWidget
      phase={qs.phase}
      error={qs.error}
      onRetry={() => {
        query.refetch();
      }}
      emptyDescription="No hay sincronizaciones registradas"
    >
      <div className="max-h-96 overflow-auto rounded border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Registros</th>
              <th className="px-3 py-2">Mensaje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {query.data?.items.map((log: IntegrationSyncLog) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                  {new Date(log.startedAt).toLocaleString('es-CL')}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                  {log.completedAt ? new Date(log.completedAt).toLocaleString('es-CL') : '—'}
                </td>
                <td className="px-3 py-2">{SYNC_STATUS_LABELS[log.status]}</td>
                <td className="px-3 py-2">{log.recordsSynced}</td>
                <td className="max-w-xs truncate text-gray-500" title={log.errorMessage ?? undefined}>
                  {log.errorMessage ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.data != null && query.data.total > logsLimit && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            Pagina {logsPage} de {logsTotalPages} ({query.data.total} registros)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={logsPage <= 1}
              onClick={() => {
                onPageChange(Math.max(1, logsPage - 1));
              }}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={logsPage >= logsTotalPages}
              onClick={() => {
                onPageChange(Math.min(logsTotalPages, logsPage + 1));
              }}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </DataWidget>
  );
}
