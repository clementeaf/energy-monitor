import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/auth/useAuth';
import { useAppStore } from '../../store/useAppStore';
import { useAlerts, useAcknowledgeAlert, useSyncOfflineAlerts } from '../../hooks/queries/useAlerts';
import { hasPermission } from '../../auth/permissions';
import type { Alert, AlertStatus } from '../../types';
import { appRoutes, canAccessRoute } from '../../app/appRoutes';

function statusBadge(status: AlertStatus) {
  switch (status) {
    case 'active':
      return 'bg-red-500/20 text-red-400';
    case 'acknowledged':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'resolved':
      return 'bg-green-500/20 text-green-400';
  }
}

function severityBadge(severity: Alert['severity']) {
  switch (severity) {
    case 'critical':
      return 'bg-red-600/25 text-red-300';
    case 'high':
      return 'bg-orange-500/20 text-orange-300';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'low':
      return 'bg-sky-500/20 text-sky-300';
  }
}

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

function timeAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export function AlertsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedSiteId } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const { data: alerts, isLoading, isFetching } = useAlerts(
    {
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 100,
      buildingId: selectedSiteId && selectedSiteId !== '*' ? selectedSiteId : undefined,
    },
    { refetchInterval: 30_000, staleTime: 10_000 },
  );
  const acknowledgeMutation = useAcknowledgeAlert();
  const syncMutation = useSyncOfflineAlerts();
  const canManageAlerts = !!user && hasPermission(user.role, 'ALERTS', 'manage');
  const canOpenMeterDetail = !!user && canAccessRoute(user.role, appRoutes.meterDetail);

  const summary = useMemo(() => {
    const items = alerts ?? [];
    return {
      total: items.length,
      active: items.filter((alert) => alert.status === 'active').length,
      acknowledged: items.filter((alert) => alert.status === 'acknowledged').length,
      resolved: items.filter((alert) => alert.status === 'resolved').length,
    };
  }, [alerts]);

  if (isLoading) return <BuildingsPageSkeleton />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Alertas y notificaciones" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'all', label: 'Todas', value: summary.total },
            { key: 'active', label: 'Activas', value: summary.active },
            { key: 'acknowledged', label: 'Reconocidas', value: summary.acknowledged },
            { key: 'resolved', label: 'Resueltas', value: summary.resolved },
          ].map((item) => (
            <Card
              key={item.key}
              className={`min-w-36 px-4 py-3 ${statusFilter === item.key ? 'border-accent bg-raised' : ''}`}
              onClick={() => setStatusFilter(item.key as AlertStatus | 'all')}
            >
              <div className="text-xs uppercase tracking-wide text-muted">{item.label}</div>
              <div className="mt-1 text-2xl font-semibold text-text">{item.value}</div>
            </Card>
          ))}
        </div>

        {canManageAlerts && (
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncMutation.isPending ? 'Sincronizando…' : 'Sincronizar offline'}
          </button>
        )}
      </div>

      {canManageAlerts && syncMutation.data && (
        <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Última sincronización manual: <span className="font-medium text-text">{formatDate(syncMutation.data.scannedAt)}</span>
          {' • '}
          creadas <span className="font-medium text-text">{syncMutation.data.createdAlerts}</span>
          {' • '}
          resueltas <span className="font-medium text-text">{syncMutation.data.resolvedAlerts}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-raised text-text">
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Severidad</th>
              <th className="px-4 py-3 font-semibold">Alerta</th>
              <th className="px-4 py-3 font-semibold">Medidor</th>
              <th className="px-4 py-3 font-semibold">Edificio</th>
              <th className="px-4 py-3 font-semibold">Detectada</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(alerts ?? []).map((alert) => (
              <tr
                key={alert.id}
                className="cursor-pointer border-b border-border align-top hover:bg-raised/70"
                onClick={() => navigate(appRoutes.alertDetail.path.replace(':id', alert.id))}
              >
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(alert.status)}`}>
                    {alert.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${severityBadge(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{alert.title}</div>
                  <div className="mt-1 max-w-xl text-muted">{alert.message}</div>
                </td>
                <td className="px-4 py-3">
                  {alert.meterId && canOpenMeterDetail ? (
                    <button
                      onClick={() => navigate(appRoutes.meterDetail.path.replace(':meterId', alert.meterId!))}
                      className="font-medium text-accent hover:underline"
                    >
                      {alert.meterId}
                    </button>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-muted">{alert.buildingId ?? '—'}</td>
                <td className="px-4 py-3 text-muted">
                  <div>{formatDate(alert.triggeredAt)}</div>
                  <div className="mt-1 text-xs">{timeAgo(alert.triggeredAt)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {canManageAlerts && alert.status === 'active' && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          acknowledgeMutation.mutate(alert.id);
                        }}
                        disabled={acknowledgeMutation.isPending}
                        className="rounded-md border border-border px-3 py-1 text-xs font-medium text-text hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reconocer
                      </button>
                    )}
                    {alert.meterId && canOpenMeterDetail && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(appRoutes.meterDetail.path.replace(':meterId', alert.meterId!));
                        }}
                        className="rounded-md border border-border px-3 py-1 text-xs font-medium text-muted hover:bg-raised"
                      >
                        Ver medidor
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {alerts?.length === 0 && (
          <div className="flex h-56 items-center justify-center text-sm text-muted">
            {isFetching ? 'Actualizando alertas…' : 'No hay alertas para el filtro seleccionado.'}
          </div>
        )}
      </div>
    </div>
  );
}
