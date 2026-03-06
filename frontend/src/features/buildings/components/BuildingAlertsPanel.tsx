import { useNavigate } from 'react-router';
import { Card } from '../../../components/ui/Card';
import { appRoutes } from '../../../app/appRoutes';
import type { Alert } from '../../../types';

interface BuildingAlertsPanelProps {
  buildingId: string;
  alerts: Alert[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BuildingAlertsPanel({ buildingId, alerts }: Readonly<BuildingAlertsPanelProps>) {
  const navigate = useNavigate();
  const affectedMeters = new Set(alerts.map((alert) => alert.meterId).filter(Boolean)).size;

  return (
    <section className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Alertas activas del edificio</h2>
          <p className="mt-1 text-sm text-muted">Medidores offline y eventos que requieren seguimiento.</p>
        </div>
        <button
          onClick={() => navigate(appRoutes.alerts.path)}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          Ver todas las alertas
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="border-red-500/20 bg-red-500/10">
          <div className="text-xs uppercase tracking-wide text-muted">Alertas activas</div>
          <div className="mt-2 text-3xl font-bold text-red-300">{alerts.length}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted">Medidores afectados</div>
          <div className="mt-2 text-3xl font-bold text-text">{affectedMeters}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted">Edificio</div>
          <div className="mt-2 text-lg font-semibold text-text">{buildingId}</div>
        </Card>
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 4).map((alert) => (
          <button
            key={alert.id}
            onClick={() => alert.meterId && navigate(appRoutes.meterDetail.path.replace(':meterId', alert.meterId))}
            className="flex w-full items-start justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-raised"
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
    </section>
  );
}
