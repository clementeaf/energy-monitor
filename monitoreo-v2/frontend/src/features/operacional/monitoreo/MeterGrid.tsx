import { useNavigate } from 'react-router';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';
import { deriveMeterStatus, STATUS_STYLES } from './monitoreo-utils';

interface MeterGridProps {
  meters: Meter[];
  readingByMeter: Map<string, LatestReading>;
  yesterdayPowerByMeter: Map<string, number>;
  now: number;
}

export function MeterGrid({ meters, readingByMeter, yesterdayPowerByMeter, now }: Readonly<MeterGridProps>) {
  const navigate = useNavigate();

  return (
    <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
      <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted">Medidores del mall seleccionado</p>
      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted">
              <th className="px-2 py-1.5">Serial</th>
              <th className="px-2 py-1.5">Zona</th>
              <th className="px-2 py-1.5 text-center">Estado</th>
              <th className="px-2 py-1.5 text-right">Último valor</th>
              <th className="px-2 py-1.5">Timestamp</th>
              <th className="px-2 py-1.5 text-right">Var. vs día ant.</th>
            </tr>
          </thead>
        </table>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full">
            <tbody className="divide-y divide-border">
              {meters.length > 0 ? meters.map((meter, i) => {
                const reading = readingByMeter.get(meter.id);
                const status = deriveMeterStatus(reading, now);
                const sStyle = STATUS_STYLES[status];
                const currentKw = reading ? Number(reading.power_kw) : 0;
                const yesterdayKw = yesterdayPowerByMeter.get(meter.id);
                const varPct = yesterdayKw && yesterdayKw > 0 && reading ? Math.round(((currentKw - yesterdayKw) / yesterdayKw) * 100) : null;
                return (
                  <tr key={meter.id} className="animate-fade-in cursor-pointer transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }} onClick={() => navigate(`/monitoring/meter/${meter.id}`)}>
                    <td className="px-2 py-1.5 font-medium text-foreground">{meter.code ?? meter.name}</td>
                    <td className="px-2 py-1.5 text-muted">{(meter.metadata as Record<string, string>)?.zone ?? '—'}</td>
                    <td className="px-2 py-1.5 text-center"><span className={`inline-block size-2 rounded-full ${sStyle.dot}`} title={sStyle.label} /></td>
                    <td className="px-2 py-1.5 text-right text-muted">{reading ? `${Number(reading.power_kw).toFixed(1)} kW` : '—'}</td>
                    <td className="px-2 py-1.5 text-muted">{reading ? new Date(reading.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-2 py-1.5 text-right">{varPct != null ? <span className={`font-medium ${varPct > 0 ? 'text-danger' : varPct < 0 ? 'text-success' : 'text-muted'}`}>{varPct > 0 ? '↑' : varPct < 0 ? '↓' : '→'} {Math.abs(varPct)}%</span> : <span className="text-muted">—</span>}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="px-2 py-6 text-center text-muted">Seleccione un mall para ver sus medidores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
