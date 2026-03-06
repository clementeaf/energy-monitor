import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../../../components/ui/Card';
import { appRoutes } from '../../../app/appRoutes';
import type { Alert } from '../../../types';

interface AlertsOverviewPanelProps {
  alerts: Alert[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AlertsOverviewPanel({ alerts }: Readonly<AlertsOverviewPanelProps>) {
  const navigate = useNavigate();

  const summary = useMemo(() => {
    const affectedBuildings = new Set(alerts.map((alert) => alert.buildingId).filter(Boolean));
    const offlineMeters = new Set(alerts.map((alert) => alert.meterId).filter(Boolean));
    const latestAlert = alerts[0] ?? null;

    return {
      total: alerts.length,
      affectedBuildings: affectedBuildings.size,
      offlineMeters: offlineMeters.size,
      latestAlert,
    };
  }, [alerts]);

  return (
    <section className="mb-6 rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/10 via-surface to-surface p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Resumen de alertas activas</h2>
          <p className="mt-1 text-sm text-muted">Visibilidad rápida de medidores offline detectados por el backend.</p>
        </div>
        <button
          onClick={() => navigate(appRoutes.alerts.path)}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          Ver bandeja de alertas
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-red-500/20 bg-red-500/5">
            <div className="text-xs uppercase tracking-wide text-muted">Alertas activas</div>
            <div className="mt-2 text-3xl font-bold text-red-300">{summary.total}</div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-muted">Medidores offline</div>
            <div className="mt-2 text-3xl font-bold text-text">{summary.offlineMeters}</div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-muted">Edificios afectados</div>
            <div className="mt-2 text-3xl font-bold text-text">{summary.affectedBuildings}</div>
          </Card>
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Más recientes</h3>
            {summary.latestAlert && <span className="text-xs text-muted">Última: {formatDate(summary.latestAlert.triggeredAt)}</span>}
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 3).map((alert) => (
              <button
                key={alert.id}
                onClick={() => navigate(appRoutes.meterDetail.path.replace(':meterId', alert.meterId ?? ''))}
                disabled={!alert.meterId}
                className="flex w-full items-start justify-between gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-raised disabled:cursor-default disabled:opacity-80"
              >
                <div>
                  <div className="font-medium text-text">{alert.title}</div>
                  <div className="mt-1 text-sm text-muted">{alert.message}</div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted">
                  <div>{alert.meterId ?? '—'}</div>
                  <div className="mt-1">{formatDate(alert.triggeredAt)}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
