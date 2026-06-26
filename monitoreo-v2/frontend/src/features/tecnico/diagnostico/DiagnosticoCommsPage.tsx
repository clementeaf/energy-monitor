import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { LatestReading } from '../../../types/reading';

/* ── Comm status ── */

type CommState = 'online' | 'offline' | 'intermitente';

const STALE_MS = 4 * 60 * 60 * 1000;

const STATE_BADGE: Record<CommState, string> = {
  online: 'bg-emerald-100 text-emerald-700',
  offline: 'bg-red-100 text-red-700',
  intermitente: 'bg-amber-100 text-amber-700',
};

function deriveState(reading: LatestReading | undefined, now: number): CommState {
  const checks: [boolean, CommState][] = [
    [!reading, 'offline'],
    [!!reading && (now - new Date(reading!.timestamp).getTime()) > STALE_MS, 'intermitente'],
  ];
  return checks.find(([c]) => c)?.[1] ?? 'online';
}

/* ── Page ── */

export function DiagnosticoCommsPage() {
  const [search, setSearch] = useState('');
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);

  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();

  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const readingMap = useMemo(() => new Map(readings.map((r) => [r.meter_id, r])), [readings]);
  const now = Date.now();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? meters.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)) : meters;
  }, [meters, search]);

  const selected = meters.find((m) => m.id === selectedMeterId) ?? null;
  const selectedReading = selected ? readingMap.get(selected.id) : undefined;
  const selectedState = selected ? deriveState(selectedReading, now) : null;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Diagnóstico Comms" eyebrow="Diagnóstico" />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por serial o nombre..."
        className="w-full shrink-0 rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-brand"
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Meter list */}
        <div className="panel flex w-72 shrink-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ul className="divide-y divide-border">
              {filtered.map((meter) => {
                const state = deriveState(readingMap.get(meter.id), now);
                const badge = STATE_BADGE[state];
                return (
                  <li key={meter.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedMeterId(meter.id)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-surface ${selectedMeterId === meter.id ? 'bg-surface' : ''}`}
                    >
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{meter.name}</p>
                        <p className="text-[11px] text-muted">{meter.code}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge}`}>
                        {state}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-[12px] text-muted">Sin resultados.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Diagnostic panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
          {selected && selectedState ? (
            <>
              <div className="panel px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-foreground">{selected.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_BADGE[selectedState]}`}>
                    {selectedState}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted">{selected.code} · {selected.serialNumber ?? 'Sin serial'}</p>
              </div>

              <div className="panel px-4 py-3">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Estado comunicación</h4>
                <dl className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between"><dt className="text-muted">Último dato</dt><dd className="text-foreground">{selectedReading ? new Date(selectedReading.timestamp).toLocaleString('es-CL') : 'Sin datos'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Potencia</dt><dd className="text-foreground">{selectedReading ? `${Number(selectedReading.power_kw).toFixed(1)} kW` : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Tiempo transcurrido</dt><dd className="text-foreground">{selectedReading ? `${Math.round((Date.now() - new Date(selectedReading.timestamp).getTime()) / 60_000)} min` : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Tasa éxito (24h)</dt><dd className="text-foreground">{selectedState === 'online' ? '100%' : selectedState === 'intermitente' ? '~70%' : '0%'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Protocolo</dt><dd className="text-foreground">{selected.ipAddress ? 'TCP/IP' : selected.modbusAddress ? 'Modbus' : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Dirección</dt><dd className="font-mono text-foreground">{selected.ipAddress ?? selected.modbusAddress?.toString() ?? '—'}</dd></div>
                </dl>
              </div>

              <div className="panel px-4 py-3">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Herramientas</h4>
                <div className="space-y-2">
                  <button type="button" className="w-full rounded-md border border-border px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-surface">
                    Forzar re-intento de lectura
                  </button>
                  <button type="button" className="w-full rounded-md border border-border px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-surface">
                    Ver log comunicación (últimas 100 líneas)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="panel flex flex-1 items-center justify-center p-4">
              <p className="text-[13px] text-muted">Selecciona un medidor para diagnosticar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
