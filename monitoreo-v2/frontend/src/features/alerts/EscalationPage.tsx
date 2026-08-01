import { TableStateBody } from '../../components/ui/TableStateBody';
import { useQueryState } from '../../hooks/useQueryState';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useAlertsQuery } from '../../hooks/queries/useAlertsQuery';
import { ALERT_TYPE_LABELS } from '../../types/alert-engine';
import { PageHeader } from '../../components/ui/PageHeader';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-danger/10 text-danger',
  high: 'bg-warning/10 text-warning',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-info/10 text-info',
};

function minutesAgo(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 60_000);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
}

export function EscalationPage() {
  const query = useAlertsQuery({ status: 'active' });
  const ackQuery = useAlertsQuery({ status: 'acknowledged' });

  const qs = useQueryState(query, {
    isEmpty: (data) => !data || data.length === 0,
  });

  const openAlerts = [...(query.data ?? []), ...(ackQuery.data ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const { visible: visibleAlerts, hasMore, sentinelRef, total } = useInfiniteScroll(openAlerts, [query.data, ackQuery.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Escalamiento y SLA" eyebrow="Alertas" />

      <div className="flex flex-wrap gap-4">
        {['critical', 'high', 'medium', 'low'].map((sev) => {
          const count = openAlerts.filter((a) => a.severity === sev).length;
          return (
            <div key={sev} className="panel flex-1 min-w-[120px] p-4 text-center">
              <div className="text-3xl font-bold text-foreground">{count}</div>
              <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[sev]}`}>
                {sev}
              </span>
            </div>
          );
        })}
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Mensaje</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Severidad</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Tiempo Abierta</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Valor / Umbral</th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={6}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="Sin alertas abiertas"
            skeletonWidths={['w-24', 'w-40', 'w-16', 'w-16', 'w-20', 'w-20']}
          >
            {visibleAlerts.map((alert) => {
              const mins = minutesAgo(alert.createdAt);
              return (
                <tr key={alert.id}>
                  <td className="px-4 py-3 text-xs font-mono">{ALERT_TYPE_LABELS[alert.alertTypeCode] ?? alert.alertTypeCode}</td>
                  <td className="px-4 py-3 max-w-xs truncate" title={alert.message}>{alert.message}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[alert.severity]}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{alert.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <span className={mins > 1440 ? 'text-danger font-bold' : mins > 120 ? 'text-warning' : 'text-muted'}>
                      {formatDuration(mins)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {alert.triggeredValue !== null ? alert.triggeredValue : '—'} / {alert.thresholdValue !== null ? alert.thresholdValue : '—'}
                  </td>
                </tr>
              );
            })}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && <p className="px-4 py-2 text-xs text-muted">Mostrando {visibleAlerts.length} de {total}</p>}

    </div>
  );
}
