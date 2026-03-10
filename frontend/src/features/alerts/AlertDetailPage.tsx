import { useNavigate, useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/auth/useAuth';
import { useAlert, useAcknowledgeAlert } from '../../hooks/queries/useAlerts';
import { hasPermission } from '../../auth/permissions';
import { appRoutes, canAccessRoute } from '../../app/appRoutes';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusTone(status: string) {
  switch (status) {
    case 'active':
      return 'bg-red-500/20 text-red-300';
    case 'acknowledged':
      return 'bg-yellow-500/20 text-yellow-300';
    default:
      return 'bg-green-500/20 text-green-300';
  }
}

export function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: alert, isLoading } = useAlert(id!);
  const acknowledgeMutation = useAcknowledgeAlert();
  const canManageAlerts = !!user && hasPermission(user.role, 'ALERT_DETAIL', 'manage');
  const canOpenMeter = !!user && canAccessRoute(user.role, appRoutes.meterDetail);
  const metadataEntries = alert ? Object.entries(alert.metadata ?? {}) : [];

  if (isLoading) return <BuildingsPageSkeleton />;
  if (!alert) return <p className="text-sm text-muted">Alerta no encontrada.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Detalle de alerta"
        showBack
        breadcrumbs={[
          { label: 'Alertas', to: appRoutes.alerts.path },
          { label: alert.title },
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(alert.status)}`}>
                {alert.status}
              </span>
              <span className="rounded-full bg-slate-500/20 px-2 py-1 text-xs font-semibold text-slate-200">
                {alert.severity}
              </span>
              <span className="rounded-full bg-slate-500/20 px-2 py-1 text-xs font-semibold text-slate-200">
                {alert.type}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-text">{alert.title}</h2>
            <p className="mt-3 max-w-3xl text-sm text-muted">{alert.message}</p>
          </div>

          {canManageAlerts && alert.status === 'active' && (
            <button
              onClick={() => acknowledgeMutation.mutate(alert.id)}
              disabled={acknowledgeMutation.isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60"
            >
              {acknowledgeMutation.isPending ? 'Reconociendo…' : 'Reconocer alerta'}
            </button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Contexto</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Sitio</dt>
              <dd className="font-medium text-text">{alert.buildingId ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Medidor</dt>
              <dd>
                {alert.meterId && canOpenMeter ? (
                  <button
                    onClick={() => navigate(appRoutes.meterDetail.path.replace(':meterId', alert.meterId!))}
                    className="font-medium text-accent hover:underline"
                  >
                    {alert.meterId}
                  </button>
                ) : (
                  <span className="font-medium text-text">{alert.meterId ?? '—'}</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Timeline operativo</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Detectada</dt>
              <dd className="font-medium text-text">{formatDate(alert.triggeredAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Reconocida</dt>
              <dd className="font-medium text-text">{formatDate(alert.acknowledgedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Resuelta</dt>
              <dd className="font-medium text-text">{formatDate(alert.resolvedAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Metadata</h3>
        {metadataEntries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No hay metadata adicional asociada a esta alerta.</p>
        ) : (
          <div className="mt-4 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-raised">
                <tr>
                  <th className="px-4 py-3 font-semibold text-text">Campo</th>
                  <th className="px-4 py-3 font-semibold text-text">Valor</th>
                </tr>
              </thead>
              <tbody>
                {metadataEntries.map(([key, value]) => (
                  <tr key={key} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-text">{key}</td>
                    <td className="px-4 py-3 text-muted">{typeof value === 'string' ? value : JSON.stringify(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}