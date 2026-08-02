import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { LatestReading } from '../../../types/reading';

type CommStatus = 'online' | 'offline' | 'stale';

const STALE_MS = 4 * 60 * 60 * 1000;

const COMM_DOT: Record<CommStatus, string> = {
  online: 'bg-success/100',
  offline: 'bg-danger',
  stale: 'bg-warning',
};

function deriveCommStatus(reading: LatestReading | undefined, now: number): CommStatus {
  const checks: [boolean, CommStatus][] = [
    [!reading, 'offline'],
    [!!reading && (now - new Date(reading!.timestamp).getTime()) > STALE_MS, 'stale'],
  ];
  return checks.find(([c]) => c)?.[1] ?? 'online';
}

export function MedidoresCatalogoPage() {
  const navigate = useNavigate();
  const [search] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mallFilter, setMallFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();


  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);
  const readingMap = useMemo(() => new Map(readings.map((r) => [r.meter_id, r])), [readings]);
  const now = Date.now();

  const meterTypes = useMemo(() => [...new Set(meters.map((m) => m.meterType))], [meters]);

  const filtered = useMemo(() => {
    let result = meters;
    const q = search.toLowerCase();
    if (q) result = result.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || (m.serialNumber ?? '').toLowerCase().includes(q));
    if (mallFilter !== 'all') result = result.filter((m) => m.buildingId === mallFilter);
    if (typeFilter !== 'all') result = result.filter((m) => m.meterType === typeFilter);
    if (statusFilter !== 'all') {
      result = result.filter((m) => {
        const s = deriveCommStatus(readingMap.get(m.id), now);
        return s === statusFilter;
      });
    }
    return result;
  }, [meters, search, mallFilter, typeFilter, statusFilter, readingMap, now]);

  const selected = meters.find((m) => m.id === selectedId) ?? null;
  const selectedReading = selected ? readingMap.get(selected.id) : undefined;

  const avail72h = useMemo(() => {
    const bars: number[] = [];
    for (let i = 0; i < 72 * 4; i++) bars.push(Math.random() > 0.1 ? 100 : 0); // ponytail: placeholder
    return bars;
  }, [selectedId]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <PageHeader
        title="5.2 Activos (medidores)"
       
      />

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 py-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          Mall
          <DropdownSelect
            options={[{ value: 'all', label: 'Todos los centros' }, ...buildings.map((b) => ({ value: b.id, label: b.name }))]}
            value={mallFilter}
            onChange={setMallFilter}
          />
        </span>
        <span className="flex items-center gap-1">
          Estado comms
          <DropdownSelect
            options={[{ value: 'all', label: 'Todos' }, { value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }, { value: 'stale', label: 'Intermitente' }]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </span>
        <span className="flex items-center gap-1">
          Tipo
          <DropdownSelect
            options={[{ value: 'all', label: 'Todos' }, ...meterTypes.map((t) => ({ value: t, label: t }))]}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        </span>
      </div>

      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Medidores del mall</p>
        <p className="text-xs text-muted">serial · estado · protocolo · último dato</p>
        <div className="mt-2 text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted">
                <th className="px-2 py-1.5">Serial</th>
                <th className="px-2 py-1.5 text-center">Estado</th>
                <th className="px-2 py-1.5">Prot.</th>
                <th className="px-2 py-1.5">Últ. dato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice(0, 20).map((meter, i) => {
                const reading = readingMap.get(meter.id);
                const status = deriveCommStatus(reading, now);
                return (
                  <tr
                    key={meter.id}
                    className={`animate-fade-in cursor-pointer transition-colors hover:bg-surface ${selectedId === meter.id ? 'bg-surface' : ''}`}
                    style={{ animationDelay: `${i * 25}ms` }}
                    onClick={() => {
                      setSelectedId(selectedId === meter.id ? null : meter.id);
                      navigate('/monitoring/meter/' + meter.id);
                    }}
                  >
                    <td className="px-2 py-1.5 font-medium text-foreground">{meter.code ?? meter.name}</td>
                    <td className="px-2 py-1.5 text-center"><span className={`inline-block size-2 rounded-full ${COMM_DOT[status]}`} /></td>
                    <td className="px-2 py-1.5 text-muted">{meter.busId ? 'Modbus' : 'DLMS'}</td>
                    <td className="px-2 py-1.5 text-muted">{reading ? new Date(reading.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={4} className="px-2 py-4 text-center text-muted">Sin medidores.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ficha — Identificación */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Ficha — Identificación</p>
        {selected ? (
          <div className="mt-2 space-y-2 text-xs">
            <div>
              <p className="text-xs text-muted">Serial / tag / fabricante</p>
              <p className="rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground">{selected.code} · {selected.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Modelo · firmware · protocolo</p>
              <p className="rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground">{selected.loadCategory ?? '—'} · {selected.busId ? 'Modbus' : 'DLMS'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Dirección Modbus/IP · gateway</p>
              <p className="rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground">{selected.busId ?? '—'}</p>
            </div>
          </div>
        ) : <p className="mt-2 text-xs text-muted">Selecciona un medidor</p>}
      </div>

      {/* Ubicación física */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Ubicación física</p>
        <p className="text-xs text-muted">ref. Estándar Técnico Salas</p>
        {selected ? (
          <div className="mt-2 space-y-0.5 text-xs text-foreground">
            <p>• Tipo de sala · rack / tablero</p>
            <p>• Posición en tablero</p>
            <p className="text-muted">
              <span
                className="cursor-pointer hover:underline"
                onClick={() => navigate(`/buildings/${selected.buildingId}`)}
              >
                {buildingMap.get(selected.buildingId) ?? '—'}
              </span>
              {' · '}{(selected.metadata as Record<string, string>)?.zone ?? '—'}
            </p>
          </div>
        ) : <p className="mt-2 text-xs text-muted">Selecciona un medidor</p>}
      </div>

      {/* Disponibilidad 72h */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Disponibilidad 72 h (barras 15 min)</p>
        <p className="text-xs text-muted">estado de comunicación · reintentos</p>
        <div className="mt-2 flex h-8 items-end gap-[0.5px]">
          {avail72h.map((v, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${Math.max(2, v)}%`, backgroundColor: v > 0 ? '#22c55e' : '#ef4444' }} />
          ))}
        </div>
      </div>

      {/* Serie temporal 48h */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Serie temporal 48 h (gaps marcados)</p>
        <p className="text-xs text-muted">tipo de valor: real / estimado / CNR</p>
        <div className="mt-2" style={{ height: '60px' }}>
          {selected && selectedReading ? (
            <svg viewBox="0 0 200 50" className="h-full w-full" preserveAspectRatio="none">
              <path d="M0 40 L10 35 L20 38 L30 30 L40 32 L50 28 L60 25 L70 30 L80 28 L90 22 L100 25 L110 20 L120 22 L130 18 L140 20 L150 15 L160 18 L170 16 L180 12 L190 14 L200 10" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
              <line x1="0" y1="35" x2="200" y2="35" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="4 2" />
            </svg>
          ) : <p className="py-4 text-center text-xs text-muted">Selecciona un medidor</p>}
        </div>
      </div>

      {/* Historial de fallas e intervenciones */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Historial de fallas e intervenciones</p>
        <div className="mt-2 space-y-1.5 text-xs">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-block size-2 shrink-0 rounded-full bg-subtle" />
            <p className="text-foreground">Offline &gt; 4 h — reintento automático</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-block size-2 shrink-0 rounded-full bg-subtle" />
            <p className="text-foreground">Cambio de firmware — técnico</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-block size-2 shrink-0 rounded-full bg-subtle" />
            <p className="text-foreground">CNR ingresada — período repuesto</p>
          </div>
        </div>
      </div>
    </div>
  );
}
