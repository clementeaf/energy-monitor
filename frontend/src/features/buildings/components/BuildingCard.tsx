import { useNavigate } from 'react-router';
import { Card } from '../../../components/ui/Card';
import type { Alert, Building } from '../../../types';

interface BuildingCardProps {
  building: Building;
  activeAlerts?: Alert[];
}

function formatAlertDate(value: string) {
  return new Date(value).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BuildingCard({ building, activeAlerts = [] }: Readonly<BuildingCardProps>) {
  const navigate = useNavigate();
  const hasAlerts = activeAlerts.length > 0;
  const latestAlert = activeAlerts[0] ?? null;

  return (
    <Card
      className={hasAlerts ? 'border-red-500/30 bg-red-500/5' : ''}
      onClick={() => navigate(`/buildings/${building.id}`)}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-text">{building.name}</h3>
        {hasAlerts && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
            {activeAlerts.length} alerta{activeAlerts.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <p className="mb-1 text-sm text-muted">{building.address}</p>
      {latestAlert && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm">
          <div className="font-medium text-red-300">{latestAlert.title}</div>
          <div className="mt-1 text-xs text-red-200/80">
            {latestAlert.meterId ? `Medidor ${latestAlert.meterId}` : 'Medidor no identificado'}
            <span className="mx-2">•</span>
            {formatAlertDate(latestAlert.triggeredAt)}
          </div>
        </div>
      )}
      <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
        <span className="text-subtle">Area: <span className="text-muted">{building.totalArea} m²</span></span>
        <span className="text-subtle">Medidores: <span className="font-semibold text-text">{building.metersCount}</span></span>
      </div>
    </Card>
  );
}
