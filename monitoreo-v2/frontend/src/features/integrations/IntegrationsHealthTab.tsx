import { Button } from '../../components/ui/Button';
import { DataWidget } from '../../components/ui/DataWidget';
import { useQueryState } from '../../hooks/useQueryState';
import { useIntegrationsHealthQuery } from '../../hooks/queries/useIntegrationsHealthQuery';

/**
 * Formats sync latency in human-readable form.
 */
function formatLatency(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3_600_000)}h`;
}

/**
 * Health dashboard tab: integration sync latency and webhook delivery stats.
 */
export function IntegrationsHealthTab() {
  const query = useIntegrationsHealthQuery();
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined });

  const health = query.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Latencia de sincronizacion y entregas webhook en las ultimas 24 horas.
        </p>
        <Button variant="secondary" size="sm" onClick={() => { void query.refetch(); }} loading={query.isFetching}>
          Actualizar
        </Button>
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { query.refetch(); }}
        isFetching={query.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin datos de salud"
        emptyDescription="No hay integraciones configuradas para este tenant."
      >
        {health && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                label="Suscripciones activas"
                value={String(health.webhooks.activeSubscriptions)}
              />
              <KpiCard
                label="Entregas webhook (24h)"
                value={String(health.webhooks.deliveriesLast24h)}
              />
              <KpiCard
                label="Fallos webhook (24h)"
                value={String(health.webhooks.failedLast24h)}
                variant={health.webhooks.failedLast24h > 0 ? 'warning' : 'default'}
              />
            </div>

            <p className="text-xs text-subtle">
              Ultima verificacion: {new Date(health.checkedAt).toLocaleString('es-CL')}
            </p>

            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted">
                    <th className="px-4 py-3">Integracion</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Latencia sync</th>
                    <th className="px-4 py-3">Ultimo sync</th>
                    <th className="px-4 py-3">Ultimo resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {health.integrations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted">
                        Sin conectores configurados.
                      </td>
                    </tr>
                  ) : (
                    health.integrations.map((item) => (
                      <tr key={item.id} className="hover:bg-surface">
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-muted">{item.integrationType}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3">{formatLatency(item.syncLatencyMs)}</td>
                        <td className="px-4 py-3 text-muted">
                          {item.lastSyncAt
                            ? new Date(item.lastSyncAt).toLocaleString('es-CL')
                            : 'Nunca'}
                        </td>
                        <td className="px-4 py-3">
                          {item.lastSyncStatus ?? '—'}
                          {item.lastSyncError && (
                            <span className="mt-0.5 block truncate text-xs text-danger" title={item.lastSyncError}>
                              {item.lastSyncError}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DataWidget>
    </div>
  );
}

function KpiCard({
  label,
  value,
  variant = 'default',
}: Readonly<{ label: string; value: string; variant?: 'default' | 'warning' }>) {
  return (
    <div className={`rounded-lg border p-4 ${variant === 'warning' ? 'border-warning/40 bg-warning/5' : 'border-border bg-surface'}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const isError = status === 'error';
  const isActive = status === 'active';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isError
          ? 'bg-danger/10 text-danger'
          : isActive
            ? 'bg-success/10 text-success'
            : 'bg-raised text-muted'
      }`}
    >
      {status}
    </span>
  );
}
