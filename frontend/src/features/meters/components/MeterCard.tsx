import { useNavigate } from 'react-router';
import { Card } from '../../../components/ui/Card';
import type { Alert, Meter } from '../../../types';

interface MeterCardProps {
  meter: Meter;
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

export function MeterCard({ meter, activeAlerts = [] }: Readonly<MeterCardProps>) {
  const navigate = useNavigate();
  const latestAlert = activeAlerts[0] ?? null;

  return (
    <Card
      className={activeAlerts.length > 0 ? 'border-red-500/30 bg-red-500/5' : ''}
      onClick={() => navigate(`/meters/${meter.id}`)}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text">{meter.id}</h3>
        <div className="flex items-center gap-2">
          {activeAlerts.length > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
              {activeAlerts.length} alerta{activeAlerts.length === 1 ? '' : 's'}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              meter.status === 'online'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {meter.status}
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">{meter.model} &middot; {meter.phaseType}</p>
      <div className="mt-2 flex justify-between text-sm text-subtle">
        <span>Bus: {meter.busId}</span>
        <span>Addr: {meter.modbusAddress}</span>
      </div>
      {latestAlert && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs">
          <div className="font-medium text-red-300">{latestAlert.title}</div>
          <div className="mt-1 text-red-200/80">{formatAlertDate(latestAlert.triggeredAt)}</div>
        </div>
      )}
      {meter.lastReadingAt && (
        <p className="mt-1 text-xs text-subtle">
          Última lectura: {new Date(meter.lastReadingAt).toLocaleString('es-CL')}
        </p>
      )}
    </Card>
  );
}
