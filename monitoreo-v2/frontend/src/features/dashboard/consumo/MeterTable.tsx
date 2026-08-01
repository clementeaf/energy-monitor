import { useNavigate } from 'react-router';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';

interface MeterTableProps {
  meters: Meter[];
  readings: LatestReading[];
}

export function MeterTable({ meters, readings }: Readonly<MeterTableProps>) {
  const navigate = useNavigate();

  const mallTotal = readings.reduce((s, r) => s + Number(r.energy_kwh_total || 0), 0) / 1000;

  return (
    <div className="panel flex min-h-0 flex-col overflow-hidden p-3">
      <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted">Medidores del mall</p>
      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted">
              <th className="px-2 py-1.5">ID medidor</th>
              <th className="px-2 py-1.5">Zona</th>
              <th className="px-2 py-1.5 text-right">Consumo [MWh]</th>
              <th className="px-2 py-1.5 text-right">% del total</th>
              <th className="px-2 py-1.5 text-right">Último valor</th>
              <th className="px-2 py-1.5">Timestamp</th>
              <th className="px-2 py-1.5 text-center">Estado</th>
            </tr>
          </thead>
        </table>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full">
            <tbody className="divide-y divide-border">
              {meters.length > 0 ? meters.map((meter, i) => {
                const reading = readings.find((r) => r.meter_id === meter.id);
                const mwh = Number(reading?.energy_kwh_total ?? 0) / 1000;
                const pct = mallTotal > 0 ? (mwh / mallTotal) * 100 : 0;
                const isOnline = !!reading;
                const stale = reading ? (Date.now() - new Date(reading.timestamp).getTime()) > 4 * 3_600_000 : false;
                const statusLabel = !isOnline ? 'offline' : stale ? 'stale' : 'online';
                const statusDot = statusLabel === 'online' ? 'bg-success/100' : statusLabel === 'stale' ? 'bg-warning/60' : 'bg-subtle';
                const zone = (meter.metadata as Record<string, string>)?.zone ?? meter.loadCategory ?? '—';
                return (
                  <tr
                    key={meter.id}
                    className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => navigate(`/monitoring/meter/${meter.id}`)}
                  >
                    <td className="px-2 py-1.5 font-medium text-foreground">{meter.code}</td>
                    <td className="px-2 py-1.5 text-muted">{zone}</td>
                    <td className="px-2 py-1.5 text-right text-foreground">{mwh > 0 ? mwh.toFixed(2) : '—'}</td>
                    <td className="px-2 py-1.5 text-right text-muted">{pct > 0 ? `${pct.toFixed(1)}%` : '—'}</td>
                    <td className="px-2 py-1.5 text-right text-foreground">{reading ? `${Number(reading.power_kw).toFixed(1)} kW` : '—'}</td>
                    <td className="px-2 py-1.5 text-muted">{reading ? new Date(reading.timestamp).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-2 py-1.5 text-center"><span className={`inline-block size-2 rounded-full ${statusDot}`} title={statusLabel} /></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="px-2 py-4 text-center text-muted">Seleccione un mall para ver sus medidores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
