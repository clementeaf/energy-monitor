import { useNavigate } from 'react-router';
import { Card } from '../../../components/ui/Card';
import type { Meter } from '../../../types';

interface MeterCardProps {
  meter: Meter;
}

export function MeterCard({ meter }: MeterCardProps) {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate(`/meters/${meter.id}`)}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text">{meter.id}</h3>
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
      <p className="mt-1 text-sm text-muted">{meter.model} &middot; {meter.phaseType}</p>
      <div className="mt-2 flex justify-between text-sm text-subtle">
        <span>Bus: {meter.busId}</span>
        <span>Addr: {meter.modbusAddress}</span>
      </div>
      {meter.lastReadingAt && (
        <p className="mt-1 text-xs text-subtle">
          Última lectura: {new Date(meter.lastReadingAt).toLocaleString('es-CL')}
        </p>
      )}
    </Card>
  );
}
