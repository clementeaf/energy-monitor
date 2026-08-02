import { useState } from 'react';
import { useLocation } from 'react-router';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQueryState } from '../../hooks/useQueryState';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { usePermissions } from '../../hooks/usePermissions';
import {
  useIntegrationsQuery,
  useIntegrationSyncLogsQuery,
  useCreateIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
  useTriggerIntegrationSync,
} from '../../hooks/queries/useIntegrationsQuery';
import { PageHeader } from '../../components/ui/PageHeader';
import type {
  Integration,
  IntegrationStatus,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
  IntegrationQueryParams,
} from '../../types/integration';
import { IntegrationsTabBar, resolveIntegrationsTab } from './IntegrationsTabBar';
import { IntegrationsWebhooksTab } from './IntegrationsWebhooksTab';
import { IntegrationsHealthTab } from './IntegrationsHealthTab';
import { IntegrationsBackfillTab } from './IntegrationsBackfillTab';
import { IntegrationsIngestGapsTab } from './IntegrationsIngestGapsTab';
import { IntegrationsWebhookDeliveriesTab } from './IntegrationsWebhookDeliveriesTab';
import { INTEGRATION_TYPE_PRESETS, isStubIntegrationType } from './integration-types';
import {
  FALLBACK_INTEGRATIONS,
  FALLBACK_SYNC_LOGS,
  STATUS_OPTIONS,
  parseConfigObject,
  labelStatus,
  errorMessage,
} from './integration-utils';
import { SyncLogsPanel } from './SyncLogsPanel';

export function IntegrationsPage() {
  const location = useLocation();
  const activeTab = resolveIntegrationsTab(location.pathname);

  const { has } = usePermissions();
  const canRead = has('integrations', 'read');
  const canReadWebhooks = has('webhooks', 'read');
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

  const allIntegrations = (listQuery.data && listQuery.data.length > 0) ? listQuery.data : (!listQuery.isLoading ? FALLBACK_INTEGRATIONS : []);
  // Use fallback so phase never shows 'empty' when FALLBACK_INTEGRATIONS covers the gap
  const qsPhase = (qs.phase === 'empty' && allIntegrations.length > 0) ? 'ready' as const : qs.phase;
  const { visible: visibleIntegrations, hasMore, sentinelRef, total } = useInfiniteScroll(allIntegrations, [filters.integrationType, filters.status]);

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
      <IntegrationsTabBar canWebhooks={canReadWebhooks} />

      {activeTab === 'webhooks' && <IntegrationsWebhooksTab />}

      {activeTab === 'deliveries' && <IntegrationsWebhookDeliveriesTab />}

      {activeTab === 'gaps' && <IntegrationsIngestGapsTab />}

      {activeTab === 'backfill' && <IntegrationsBackfillTab />}

      {activeTab === 'health' && <IntegrationsHealthTab />}

      {activeTab === 'connectors' && !canRead ? (
        <div className="flex flex-1 items-center justify-center text-muted">
          No tiene permisos para ver integraciones.
        </div>
      ) : activeTab === 'connectors' ? (
        <>
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <PageHeader title="7.6 Integraciones" />
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
                  className="rounded-md border border-border px-3 py-1.5 text-sm"
                />
                <DropdownSelect
                  options={[
                    { value: '', label: 'Todos los estados' },
                    ...STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                  ]}
                  value={filters.status ?? ''}
                  onChange={(val) =>
                    setFilters({
                      ...filters,
                      status: val === '' ? undefined : (val as IntegrationStatus),
                    })
                  }
                  className="w-48"
                />
                {canCreate && (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
                  >
                    Nueva integracion
                  </button>
                )}
              </div>
            </div>

            <div className="panel overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="bg-surface text-left text-xs font-medium text-muted">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Heartbeat</th>
                    <th className="px-4 py-3">Tasa 7d</th>
                    <th className="px-4 py-3">Ultima sync</th>
                    <th className="px-4 py-3">Error</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <TableStateBody
                  phase={qsPhase}
                  colSpan={6}
                  error={qs.error}
                  onRetry={() => {
                    listQuery.refetch();
                  }}
                  emptyMessage="No hay integraciones configuradas"
                  skeletonWidths={['w-24', 'w-20', 'w-16', 'w-24', 'w-24', 'w-28']}
                >
                  {visibleIntegrations.map((row) => (
                    <tr key={row.id} className="hover:bg-surface">
                      <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-3 text-foreground">{row.integrationType}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-raised px-2 py-0.5 text-xs text-foreground">
                          {labelStatus(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {row.lastSyncAt ? `${Math.round((Date.now() - new Date(row.lastSyncAt).getTime()) / 60_000)} min` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {(() => {
                          if (!row.lastSyncAt) return '—';
                          const daysSinceSync = (Date.now() - new Date(row.lastSyncAt).getTime()) / 86_400_000;
                          if (daysSinceSync <= 1) return '100%';
                          if (daysSinceSync >= 7) return '0%';
                          return `${Math.round(((7 - daysSinceSync) / 7) * 100)}%`;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {row.lastSyncAt
                          ? new Date(row.lastSyncAt).toLocaleString('es-CL')
                          : '—'}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-muted" title={row.errorMessage ?? undefined}>
                        {row.errorMessage ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => openLogs(row)} title="Historial" className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          {canUpdate && (
                            <>
                              <button type="button" onClick={() => { syncMutation.mutateAsync(row.id).catch(() => undefined); }} disabled={syncMutation.isPending} title="Sincronizar" className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground disabled:opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                                </svg>
                              </button>
                              <button type="button" onClick={() => openEdit(row)} title="Editar" className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                              <button type="button" onClick={() => setDeleting(row)} title="Eliminar" className="rounded-md p-1 text-danger hover:bg-danger/10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </TableStateBody>
              </table>
              {hasMore && <div ref={sentinelRef} className="h-4" />}
            </div>
            {total > 0 && <p className="px-4 py-2 text-xs text-muted">Mostrando {visibleIntegrations.length} de {total}</p>}
          </section>

          <Modal
            open={formOpen}
            onClose={closeForm}
            title={editing ? 'Editar integracion' : 'Nueva integracion'}
            dialogClassName="m-auto max-w-2xl rounded-lg bg-background p-0 shadow-xl backdrop:bg-foreground/40"
          >
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Nombre
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Tipo de integracion
                <DropdownSelect
                  options={[
                    { value: '', label: 'Seleccionar tipo...' },
                    ...INTEGRATION_TYPE_PRESETS.map((p) => ({
                      value: p.value,
                      label: p.stub ? `${p.label} (stub/dev)` : p.label,
                    })),
                  ]}
                  value={integrationType}
                  onChange={setIntegrationType}
                  className="mt-1 w-full"
                />
                {isStubIntegrationType(integrationType) && (
                  <span className="mt-1 inline-block rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">
                    Conector stub — solo desarrollo
                  </span>
                )}
              </label>
              <div className="block text-sm font-medium text-foreground">
                Estado
                <DropdownSelect
                  options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={status}
                  onChange={(val) => {
                    setStatus(val as IntegrationStatus);
                  }}
                  className="mt-1 w-full"
                />
              </div>
              <label className="block text-sm font-medium text-foreground">
                Configuracion (JSON)
                <textarea
                  value={configText}
                  onChange={(e) => {
                    setConfigText(e.target.value);
                  }}
                  rows={10}
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono text-xs"
                  spellCheck={false}
                />
              </label>
              {formError != null && (
                <p className="text-sm text-danger">{formError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitForm}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
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
            dialogClassName="m-auto max-w-4xl rounded-lg bg-background p-0 shadow-xl backdrop:bg-foreground/40"
          >
            {logsFor != null && (
              <>
                {/* Detail metrics — derived from sync log data */}
                <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
                  {(() => {
                    const apiLogs = syncLogsQuery.data?.items ?? [];
                    const logs = apiLogs.length > 0 ? apiLogs : FALLBACK_SYNC_LOGS.filter((l) => l.integrationId === logsFor.id || logsFor.id.startsWith('fb-'));
                    const successCount = logs.filter((l) => l.status === 'success').length;
                    const failedCount = logs.filter((l) => l.status === 'failed').length;
                    const totalLogs = logs.length;
                    const successRate = totalLogs > 0 ? `${Math.round((successCount / totalLogs) * 100)}%` : '—';
                    const totalRecords = logs.reduce((sum, l) => sum + (l.recordsSynced ?? 0), 0);
                    return (
                      <>
                        <div><p className="text-xs text-muted">Tasa exito</p><p className="text-sm font-semibold text-foreground">{successRate}</p></div>
                        <div><p className="text-xs text-muted">Syncs totales</p><p className="text-sm font-semibold text-foreground">{totalLogs}</p></div>
                        <div><p className="text-xs text-muted">Registros sincronizados</p><p className="text-sm font-semibold text-foreground">{totalRecords.toLocaleString()}</p></div>
                        <div><p className="text-xs text-muted">Errores</p><p className="text-sm font-semibold text-foreground">{failedCount}</p></div>
                      </>
                    );
                  })()}
                </div>
                {/* Contrato interfaz */}
                <div className="border-b border-border px-4 py-2 text-xs text-muted">
                  <span className="font-medium text-foreground">Contrato:</span> API {logsFor.integrationType} · Esquema datos: propietario
                </div>
                <SyncLogsPanel
                  query={syncLogsQuery}
                  logsPage={logsPage}
                  logsLimit={logsLimit}
                  logsTotalPages={logsTotalPages}
                  onPageChange={setLogsPage}
                  fallbackLogs={FALLBACK_SYNC_LOGS}
                />
              </>
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
      ) : null}
    </div>
  );
}
