import { DataWidget } from '../../components/ui/DataWidget';
import { useQueryState } from '../../hooks/useQueryState';
import { useAlertsQuery } from '../../hooks/queries/useAlertsQuery';
import { ALERT_TYPE_LABELS } from '../../types/alert-engine';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Escalamiento y SLA</h1>

      <div className="grid grid-cols-4 gap-4">
        {['critical', 'high', 'medium', 'low'].map((sev) => {
          const count = openAlerts.filter((a) => a.severity === sev).length;
          return (
            <div key={sev} className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{count}</div>
              <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[sev]}`}>
                {sev}
              </span>
            </div>
          );
        })}
      </div>

      <DataWidget phase={qs.phase} error={qs.error} refetch={qs.refetch}>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Mensaje</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Severidad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tiempo Abierta</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Valor / Umbral</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {openAlerts.map((alert) => {
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
                    <td className="px-4 py-3 text-xs text-gray-600">{alert.status}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className={mins > 1440 ? 'text-red-600 font-bold' : mins > 120 ? 'text-orange-600' : 'text-gray-600'}>
                        {formatDuration(mins)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {alert.triggeredValue !== null ? alert.triggeredValue : '—'} / {alert.thresholdValue !== null ? alert.thresholdValue : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataWidget>

      {openAlerts.length === 0 && !query.isLoading && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-8 text-center text-sm text-green-800">
          Sin alertas abiertas
        </div>
      )}
    </div>
  );
}
