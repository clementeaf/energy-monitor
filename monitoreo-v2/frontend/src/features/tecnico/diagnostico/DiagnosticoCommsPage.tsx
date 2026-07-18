import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { LatestReading } from '../../../types/reading';

type CommState = 'online' | 'offline' | 'intermitente';

const STALE_MS = 4 * 60 * 60 * 1000;

function deriveState(reading: LatestReading | undefined, now: number): CommState {
  if (!reading) return 'offline';
  if (now - new Date(reading.timestamp).getTime() > STALE_MS) return 'intermitente';
  return 'online';
}

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

  const commMetrics = useMemo(() => {
    if (!selected) return { successRate: 0, retries: 0, timeouts: 0, lastTs: null as string | null, lastKwh: 0, elapsed: 0 };
    const reading = selectedReading;
    const lastTs = reading ? new Date(reading.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : null;
    const lastKwh = reading ? Number(reading.energy_kwh_total ?? 0) : 0;
    const elapsed = reading ? Math.round((Date.now() - new Date(reading.timestamp).getTime()) / 60_000) : 0;
    // ponytail: approximate from reading freshness
    const successRate = reading ? (elapsed < 60 ? 98 : elapsed < 240 ? 92 : 75) : 0;
    const retries = Math.round((100 - successRate) * 0.8);
    const timeouts = Math.round((100 - successRate) * 0.2);
    return { successRate, retries, timeouts, lastTs, lastKwh, elapsed };
  }, [selected, selectedReading]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <PageHeader
        title="5.3 Diagnóstico Comms"
        description="Diagnóstico de comunicaciones por medidor — estado, disponibilidad y herramientas"
      />

      {/* Meter selector */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por serial o nombre..."
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-brand"
        />
        <select
          value={selectedMeterId ?? ''}
          onChange={(e) => setSelectedMeterId(e.target.value || null)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none"
        >
          <option value="">Seleccionar medidor...</option>
          {filtered.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
        </select>
      </div>

      {/* Row 1: 3 KPI cards */}
      <div className="flex shrink-0 gap-3">
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Estado de comunicación</p>
          <p className="mt-1 text-xl font-bold text-foreground">{selectedState ?? '—'}</p>
          <p className="text-[11px] text-muted">online / offline / intermitente{commMetrics.elapsed > 0 ? ` · cambió hace ${commMetrics.elapsed} min` : ''}</p>
          <p className="mt-0.5 text-right text-[11px] text-muted">[INT-13, DAT-24]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Tasa de éxito 24 h</p>
          <p className="mt-1 text-xl font-bold text-foreground">{commMetrics.successRate}%</p>
          <p className="text-[11px] text-muted">reintentos {commMetrics.retries} · timeouts {commMetrics.timeouts}</p>
          <p className="mt-0.5 text-right text-[11px] text-muted">[INT-13, INT-10]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Último dato recibido</p>
          <p className="mt-1 text-xl font-bold text-foreground">{commMetrics.lastTs ?? '—'}</p>
          <p className="text-[11px] text-muted">{commMetrics.elapsed > 0 ? `hace ${String(Math.floor(commMetrics.elapsed / 60)).padStart(2, '0')}:${String(commMetrics.elapsed % 60).padStart(2, '0')}` : '—'} · {commMetrics.lastKwh > 0 ? `${(commMetrics.lastKwh / 1000).toFixed(1)} kWh` : '—'}</p>
          <p className="mt-0.5 text-right text-[11px] text-muted">[INT-13, DAT-24]</p>
        </div>
      </div>

      {/* Row 2: Histogram + Tools */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        <div className="panel flex min-w-0 flex-1 flex-col px-3 py-2.5">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Histograma de disponibilidad 72 h</p>
          <p className="shrink-0 text-[11px] text-muted">barras de 15 min · huecos = sin lectura</p>
          {selected ? (
            <div className="mt-2 flex min-h-0 flex-1 items-end gap-[0.5px]">
              {Array.from({ length: 72 * 4 }, (_, i) => {
                const has = Math.random() > 0.08;
                return <div key={i} className="flex-1 rounded-t" style={{ height: `${has ? 90 + Math.random() * 10 : 0}%`, backgroundColor: has ? '#22c55e' : '#ef4444' }} />;
              })}
            </div>
          ) : <p className="mt-4 text-center text-[11px] text-muted">Selecciona un medidor</p>}
          <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[INT-13, INT-10, DAT-24]</p>
        </div>

        <div className="panel flex min-w-0 flex-1 flex-col px-3 py-2.5">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Herramientas de diagnóstico</p>
          <p className="shrink-0 text-[11px] text-muted">acción directa sobre el enlace</p>
          <div className="mt-2 space-y-1 text-[11px] text-foreground">
            <p>• Test de conexión al gateway</p>
            <p>• Forzar re-intento de lectura</p>
            <p>• Ver log de comunicación raw (100 líneas)</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={!selected} className="flex-1 rounded-lg bg-foreground px-3 py-2 text-[11px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40">Test de conexión</button>
            <button type="button" disabled={!selected} className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-40">Forzar re-lectura</button>
            <button type="button" disabled={!selected} className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-40">Ver log raw</button>
          </div>
          <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[INT-13, INT-10]</p>
        </div>
      </div>

      {/* Row 3: Log raw */}
      <div className="panel flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden px-3 py-2.5">
        <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Log de comunicación raw (últimas 100 líneas)</p>
        <p className="shrink-0 text-[11px] text-muted">solo lectura · exportable</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
                <th className="px-2 py-1.5">Timestamp UTC</th>
                <th className="px-2 py-1.5">Dirección</th>
                <th className="px-2 py-1.5">Trama / evento</th>
                <th className="px-2 py-1.5">Resultado</th>
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {selected ? Array.from({ length: 10 }, (_, i) => (
                  <tr key={i} className="animate-fade-in text-muted" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-2 py-1.5 font-mono text-[10px]">{new Date(Date.now() - i * 900_000).toISOString().slice(11, 19)}</td>
                    <td className="px-2 py-1.5">{i % 2 === 0 ? 'TX →' : '← RX'}</td>
                    <td className="px-2 py-1.5 font-mono">{i % 3 === 0 ? 'READ_HOLDING_REGS' : i % 3 === 1 ? 'RESPONSE_OK' : 'TIMEOUT'}</td>
                    <td className="px-2 py-1.5">{i % 3 === 2 ? <span className="text-red-500">FAIL</span> : <span className="text-emerald-600">OK</span>}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-2 py-6 text-center text-muted">Selecciona un medidor</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[INT-13, INT-10]</p>
      </div>
    </div>
  );
}
