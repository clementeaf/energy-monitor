import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';

/* ── Meter status ── */

type CommStatus = 'online' | 'offline' | 'stale';

const STALE_MS = 4 * 60 * 60 * 1000;

const COMM_DOT: Record<CommStatus, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-red-500',
  stale: 'bg-amber-500',
};

function deriveCommStatus(reading: LatestReading | undefined, now: number): CommStatus {
  const checks: [boolean, CommStatus][] = [
    [!reading, 'offline'],
    [!!reading && (now - new Date(reading!.timestamp).getTime()) > STALE_MS, 'stale'],
  ];
  return checks.find(([c]) => c)?.[1] ?? 'online';
}

/* ── Page ── */

export function MedidoresCatalogoPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);
  const readingMap = useMemo(() => new Map(readings.map((r) => [r.meter_id, r])), [readings]);
  const now = Date.now();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? meters.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || (m.serialNumber ?? '').toLowerCase().includes(q))
      : meters;
  }, [meters, search]);

  const selected = meters.find((m) => m.id === selectedId) ?? null;
  const selectedReading = selected ? readingMap.get(selected.id) : undefined;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Medidores / Remarcador" eyebrow="Medidores" />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por serial, tag o nombre..."
        className="w-full shrink-0 rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-brand"
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Table */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Centro</th>
                  <th className="px-3 py-2 text-right">Último dato</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((meter) => {
                  const reading = readingMap.get(meter.id);
                  const status = deriveCommStatus(reading, now);
                  return (
                    <tr
                      key={meter.id}
                      className={`cursor-pointer transition-colors hover:bg-surface ${selectedId === meter.id ? 'bg-surface' : ''}`}
                      onClick={() => setSelectedId(selectedId === meter.id ? null : meter.id)}
                    >
                      <td className="px-3 py-2 font-medium text-foreground">{meter.name}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted">{meter.code}</td>
                      <td className="px-3 py-2 text-muted">{buildingMap.get(meter.buildingId) ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-[11px] text-muted">
                        {reading ? new Date(reading.timestamp).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block size-2.5 rounded-full ${COMM_DOT[status]}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ficha */}
        <div className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
          {selected ? (
            <MeterFicha meter={selected} reading={selectedReading} buildingName={buildingMap.get(selected.buildingId) ?? '—'} onNavigate={() => navigate(`/monitoring/meter/${selected.id}`)} />
          ) : (
            <div className="panel flex flex-1 items-center justify-center p-4">
              <p className="text-[13px] text-muted">Selecciona un medidor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Meter Ficha ── */

function MeterFicha({ meter, reading, buildingName, onNavigate }: Readonly<{ meter: Meter; reading?: LatestReading; buildingName: string; onNavigate: () => void }>) {
  const fields = [
    { label: 'Serial', value: meter.serialNumber ?? '—' },
    { label: 'Modelo', value: meter.model ?? '—' },
    { label: 'Tipo', value: meter.meterType },
    { label: 'Fase', value: meter.phaseType },
    { label: 'Centro', value: buildingName },
    { label: 'Categoría', value: meter.loadCategory ?? '—' },
  ];

  const readingFields = reading ? [
    { label: 'Potencia', value: `${Number(reading.power_kw).toFixed(1)} kW` },
    { label: 'Voltaje', value: reading.voltage_l1 ? `${Number(reading.voltage_l1).toFixed(1)} V` : '—' },
    { label: 'Corriente', value: reading.current_l1 ? `${Number(reading.current_l1).toFixed(1)} A` : '—' },
    { label: 'FP', value: reading.power_factor ? Number(reading.power_factor).toFixed(3) : '—' },
  ] : [];

  return (
    <>
      <div className="panel px-3 py-3">
        <p className="text-[15px] font-semibold text-foreground">{meter.name}</p>
        <p className="mt-0.5 font-mono text-[11px] text-muted">{meter.code}</p>
      </div>
      <div className="panel px-3 py-3">
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Identificación</h4>
        <dl className="space-y-1">
          {fields.map((f) => (
            <div key={f.label} className="flex justify-between text-[12px]">
              <dt className="text-muted">{f.label}</dt>
              <dd className="font-medium text-foreground">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {readingFields.length > 0 && (
        <div className="panel px-3 py-3">
          <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Última lectura</h4>
          <dl className="space-y-1">
            {readingFields.map((f) => (
              <div key={f.label} className="flex justify-between text-[12px]">
                <dt className="text-muted">{f.label}</dt>
                <dd className="font-medium text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <Button size="sm" variant="secondary" onClick={onNavigate} className="mx-3">Ver detalle completo</Button>
    </>
  );
}

import { Button } from '../../../components/ui/Button';
