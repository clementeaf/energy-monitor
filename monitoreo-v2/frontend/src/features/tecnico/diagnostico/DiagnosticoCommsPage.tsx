import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
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
            <CommDiagPanel meter={selected} reading={selectedReading} state={selectedState} />
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

/* ── Comm Diagnostic Panel — uses real hourly aggregated data ── */

import type { Meter } from '../../../types/meter';

function CommDiagPanel({ meter, reading, state }: Readonly<{ meter: Meter; reading?: LatestReading; state: CommState }>) {
  const range72h = useMemo(() => {
    const n = new Date();
    return { from: new Date(n.getTime() - 72 * 3_600_000).toISOString(), to: n.toISOString() };
  }, []);
  const hourlyQuery = useAggregatedReadingsQuery({ ...range72h, interval: 'hourly', meterId: meter.id });
  const hourlyData = hourlyQuery.data ?? [];

  // 72h availability: which hours have data
  const avail72 = useMemo(() => {
    const slots = new Array(72).fill(false);
    const n = Date.now();
    for (const r of hourlyData) {
      const idx = Math.floor((n - new Date(r.bucket).getTime()) / 3_600_000);
      const slot = 71 - idx;
      if (slot >= 0 && slot < 72) slots[slot] = true;
    }
    return slots;
  }, [hourlyData]);

  // Comm metrics derived from real data
  const commMetrics = useMemo(() => {
    // Last 24h: how many hourly slots had data
    const last24 = avail72.slice(48); // last 24 entries
    const successCount = last24.filter(Boolean).length;
    const failCount = 24 - successCount;
    const successRate = Math.round((successCount / 24) * 100);
    return { successRate, retries: failCount, timeouts: failCount };
  }, [avail72]);

  // Events: derive from hourly data transitions (data → no-data = timeout, no-data → data = recovery)
  const events = useMemo(() => {
    const result: { time: string; type: 'éxito' | 'timeout' | 'recuperación' }[] = [];
    const n = Date.now();
    // Take most recent 24 hours, walk backwards
    for (let i = 0; i < Math.min(24, avail72.length); i++) {
      const slot = 71 - i;
      const prevSlot = slot - 1;
      const ts = new Date(n - i * 3_600_000);
      const timeStr = ts.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      if (!avail72[slot]) {
        result.push({ time: timeStr, type: 'timeout' });
      } else if (prevSlot >= 0 && !avail72[prevSlot]) {
        result.push({ time: timeStr, type: 'recuperación' });
      } else {
        result.push({ time: timeStr, type: 'éxito' });
      }
    }
    return result.slice(0, 10);
  }, [avail72]);

  const [toolFeedback, setToolFeedback] = useState<string | null>(null);

  return (
    <>
      <div className="panel px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground">{meter.name}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_BADGE[state]}`}>{state}</span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-muted">{meter.code} · {meter.serialNumber ?? 'Sin serial'}</p>
      </div>

      <div className="panel px-4 py-3">
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Estado comunicación</h4>
        <dl className="space-y-1.5 text-[12px]">
          <div className="flex justify-between"><dt className="text-muted">Último dato</dt><dd className="text-foreground">{reading ? new Date(reading.timestamp).toLocaleString('es-CL') : 'Sin datos'}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Potencia</dt><dd className="text-foreground">{reading ? `${Number(reading.power_kw).toFixed(1)} kW` : '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Tiempo transcurrido</dt><dd className="text-foreground">{reading ? `${Math.round((Date.now() - new Date(reading.timestamp).getTime()) / 60_000)} min` : '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Tasa éxito (24h)</dt><dd className="text-foreground">{commMetrics.successRate}%</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Reintentos (24h)</dt><dd className="text-foreground">{commMetrics.retries}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Timeouts (24h)</dt><dd className="text-foreground">{commMetrics.timeouts}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Protocolo</dt><dd className="text-foreground">{meter.ipAddress ? 'TCP/IP' : meter.modbusAddress ? 'Modbus' : '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Dirección</dt><dd className="font-mono text-foreground">{meter.ipAddress ?? meter.modbusAddress?.toString() ?? '—'}</dd></div>
        </dl>
      </div>

      <div className="panel px-4 py-3">
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Disponibilidad — 72h (resolución horaria)</h4>
        <div className="flex h-6 gap-[1px]">
          {avail72.map((ok, i) => (
            <div key={i} className={`flex-1 rounded-sm ${ok ? 'bg-emerald-400' : 'bg-red-300'}`} title={`-${72 - i}h: ${ok ? 'OK' : 'fallo'}`} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-muted"><span>-72h</span><span>ahora</span></div>
      </div>

      <div className="panel px-4 py-3">
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Últimos eventos comunicación</h4>
        <div className="max-h-32 overflow-y-auto text-[11px]">
          {events.map((ev, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border py-1 last:border-0">
              <span className="text-muted">{ev.time}</span>
              <span className={ev.type === 'éxito' ? 'text-emerald-600' : ev.type === 'recuperación' ? 'text-blue-600' : 'text-red-600'}>{ev.type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel px-4 py-3">
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Herramientas</h4>
        <div className="space-y-2">
          <button type="button" onClick={() => setToolFeedback('Ping enviado — sin respuesta de gateway (no implementado en backend)')} className="w-full rounded-md border border-border px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-surface">
            Ping / test conexión gateway
          </button>
          <button type="button" onClick={() => setToolFeedback('Re-intento solicitado — pendiente implementación backend')} className="w-full rounded-md border border-border px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-surface">
            Forzar re-intento de lectura
          </button>
          <button type="button" onClick={() => setToolFeedback('Log no disponible — requiere endpoint backend /comm-log')} className="w-full rounded-md border border-border px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-surface">
            Ver log comunicación (últimas 100 líneas)
          </button>
        </div>
        {toolFeedback && <p className="mt-2 text-[11px] text-amber-600">{toolFeedback}</p>}
      </div>
    </>
  );
}
