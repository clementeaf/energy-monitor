import { useState } from 'react';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useToastStore } from '../../store/useToastStore';
import { PORTFOLIO_CURVE, type LoadPoint } from './fleet';
import { formatNumber } from './format';
import { LoadCurveChart } from './LoadCurveChart';
import { useEmsFleet, useLoadCurves, type LoadRange } from './useEmsFleet';

type Franja = 'todas' | 'punta' | 'valle';

const RANGO_TABS: { key: LoadRange; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7dias', label: '7 días' },
  { key: '30dias', label: '30 días' },
];

const FRANJA_TABS: { key: Franja; label: string }[] = [
  { key: 'todas', label: 'Todas las franjas' },
  { key: 'punta', label: 'Punta 18–23 h' },
  { key: 'valle', label: 'Valle 00–07 h' },
];

const FRANJA_HOURS: Record<Franja, (hour: number) => boolean> = {
  todas: () => true,
  punta: (hour) => hour >= 18 && hour <= 23,
  valle: (hour) => hour >= 0 && hour <= 7,
};

const COMPARACION_COLORS = ['var(--color-accent)', 'var(--color-info)'];
const MAX_COMPARADOS = 2;

const RANGO_SUBTITLE: Record<LoadRange, string> = { hoy: 'por hora', '7dias': 'últimos 7 días', '30dias': 'últimos 30 días' };
const FRANJA_SUBTITLE: Record<Franja, string> = { todas: '', punta: ' · punta', valle: ' · valle' };

export function toggleComparacion(current: string[], id: string): string[] {
  if (current.includes(id)) return current.length > 1 ? current.filter((existing) => existing !== id) : current;
  return [...current, id].slice(-MAX_COMPARADOS);
}

function inFranja(points: LoadPoint[], franja: Franja): LoadPoint[] {
  return points.filter((point) => FRANJA_HOURS[franja](new Date(point.timestamp).getHours()));
}

function pillClass(active: boolean): string {
  return `rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'bg-accent text-accent-ink' : 'border border-border text-foreground hover:bg-surface'}`;
}

export function ConsumoPage() {
  const [rango, setRango] = useState<LoadRange>('hoy');
  const [franja, setFranja] = useState<Franja>('todas');
  const [seleccionados, setSeleccionados] = useState<string[] | null>(null);
  const fleet = useEmsFleet();
  const loadCurves = useLoadCurves(rango);
  const showToast = useToastStore((s) => s.showToast);
  const franjaEfectiva: Franja = rango === 'hoy' ? franja : 'todas';

  const points = inFranja(loadCurves.curves.get(PORTFOLIO_CURVE) ?? [], franjaEfectiva);
  const peak = Math.max(0, ...points.map((p) => p.kw));
  const promedio = points.length > 0 ? points.reduce((sum, p) => sum + p.kw, 0) / points.length : 0;
  const factorCarga = peak > 0 ? (promedio / peak) * 100 : 0;
  const centrosComparados = seleccionados ?? fleet.centros.slice(0, MAX_COMPARADOS).map((c) => c.id);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Consumo</h1>
        <p className="text-xs text-muted">Picos y curvas de carga</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Período" className="flex rounded-lg border border-border">
          {RANGO_TABS.map((r) => (
            <button key={r.key} type="button" role="tab" aria-selected={rango === r.key} onClick={() => setRango(r.key)} className={`px-3 py-1.5 text-xs font-medium ${rango === r.key ? 'bg-card-fg text-card' : 'text-muted hover:bg-surface'}`}>{r.label}</button>
          ))}
        </div>
        <div className="flex gap-1" aria-label="Franja horaria">
          {FRANJA_TABS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFranja(f.key)}
              aria-pressed={franjaEfectiva === f.key}
              disabled={rango !== 'hoy' && f.key !== 'todas'}
              title={rango !== 'hoy' && f.key !== 'todas' ? 'Las franjas aplican a la curva por hora' : undefined}
              className={pillClass(franjaEfectiva === f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <button type="button" onClick={() => showToast('Exportando la serie de consumo…')} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised">
          ↓ Exportar serie
        </button>
      </div>

      <div className="flex shrink-0 flex-col">
        <QueryStateView phase={loadCurves.phase} error={null}>
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="Pico de demanda" value={formatNumber(peak, 1)} unit="kW" sub="Máximo del periodo" positive />
              <KpiCard label="Potencia media" value={formatNumber(promedio, 1)} unit="kW" sub="Promedio por punto" />
              <KpiCard label="Factor de carga" value={formatNumber(factorCarga, 1)} unit="%" sub="Media / pico" />
              <KpiCard label="Puntos de la serie" value={String(points.length)} sub={franjaEfectiva === 'todas' ? 'Serie completa' : 'Franja filtrada'} />
            </div>

            <div className="rounded-xl border border-card-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-card-fg">Curva de carga agregada</h2>
                  <p className="text-xs text-card-muted">Todos los centros · {RANGO_SUBTITLE[rango]}{FRANJA_SUBTITLE[franjaEfectiva]}</p>
                </div>
                <span className="rounded-full bg-info-bg px-2.5 py-0.5 text-xs font-medium text-info-ink">Analítica de Consumo</span>
              </div>
              <LoadCurveChart series={[{ label: 'Potencia (kW)', color: 'var(--color-accent)', points }]} />
            </div>
          </div>
        </QueryStateView>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <h2 className="text-sm font-semibold text-card-fg">Comparativa entre centros</h2>
        <p className="mb-3 text-xs text-card-muted">Elige dos centros para contrastar su patrón</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {fleet.centros.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={centrosComparados.includes(c.id)}
              onClick={() => setSeleccionados(toggleComparacion(centrosComparados, c.id))}
              className={pillClass(centrosComparados.includes(c.id))}
            >
              {c.name}
            </button>
          ))}
        </div>
        <QueryStateView phase={loadCurves.phase} error={null} variant="widget">
          <LoadCurveChart
            series={centrosComparados.flatMap((id, i) => {
              const centro = fleet.centros.find((c) => c.id === id);
              return centro ? [{ label: centro.name, color: COMPARACION_COLORS[i], points: inFranja(loadCurves.curves.get(id) ?? [], franjaEfectiva) }] : [];
            })}
          />
        </QueryStateView>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, sub, positive }: Readonly<{
  label: string; value: string; unit?: string; sub: string; positive?: boolean;
}>) {
  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="text-xs text-card-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-card-fg tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-card-muted">{unit}</span>}
      </p>
      <p className={`mt-1 text-[11px] ${positive ? 'text-success' : 'text-muted'}`}>{sub}</p>
    </div>
  );
}
