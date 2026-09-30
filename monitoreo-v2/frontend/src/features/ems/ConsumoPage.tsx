import { useState } from 'react';
import { QueryStateView } from '../../components/ui/QueryStateView';
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

const CENTRO_COLORS = ['var(--color-accent)', 'var(--color-warning)', 'var(--color-danger)', 'var(--color-info)', '#a78bfa', '#f472b6'];

function inFranja(points: LoadPoint[], franja: Franja): LoadPoint[] {
  return points.filter((point) => FRANJA_HOURS[franja](new Date(point.timestamp).getHours()));
}

function pillClass(active: boolean): string {
  return `rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-accent text-accent-ink' : 'border border-border text-foreground hover:bg-surface'}`;
}

export function ConsumoPage() {
  const [rango, setRango] = useState<LoadRange>('hoy');
  const [franja, setFranja] = useState<Franja>('todas');
  const [seleccionados, setSeleccionados] = useState<Set<string> | null>(null);
  const fleet = useEmsFleet();
  const loadCurves = useLoadCurves(rango);

  const points = inFranja(loadCurves.curves.get(PORTFOLIO_CURVE) ?? [], franja);
  const peak = Math.max(0, ...points.map((p) => p.kw));
  const promedio = points.length > 0 ? points.reduce((sum, p) => sum + p.kw, 0) / points.length : 0;
  const factorCarga = peak > 0 ? (promedio / peak) * 100 : 0;
  const centrosSeleccionados = seleccionados ?? new Set(fleet.centros.slice(0, 2).map((c) => c.id));

  const toggleCentro = (id: string) => {
    const next = new Set(centrosSeleccionados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSeleccionados(next);
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Consumo</h1>
        <p className="text-xs text-muted">Picos y curvas de carga</p>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {RANGO_TABS.map((r) => (
          <button key={r.key} type="button" onClick={() => setRango(r.key)} className={pillClass(rango === r.key)}>{r.label}</button>
        ))}
        <span className="mx-2 h-4 w-px bg-border" />
        {FRANJA_TABS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFranja(f.key)} className={pillClass(franja === f.key)}>{f.label}</button>
        ))}
      </div>

      <div className="flex shrink-0 flex-col">
        <QueryStateView phase={loadCurves.phase} error={null}>
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="Pico de demanda" value={formatNumber(peak, 1)} unit="kW" sub="Máximo del periodo" positive />
              <KpiCard label="Potencia media" value={formatNumber(promedio, 1)} unit="kW" sub="Promedio por punto" />
              <KpiCard label="Factor de carga" value={formatNumber(factorCarga, 1)} unit="%" sub="Media / pico" />
              <KpiCard label="Puntos de la serie" value={String(points.length)} sub={rango === '30dias' ? 'Un punto por día' : 'Un punto por hora'} />
            </div>

            <div className="rounded-xl border border-card-border bg-card p-4">
              <h2 className="text-sm font-semibold text-card-fg">Curva de carga agregada</h2>
              <p className="text-xs text-card-muted">Todos los centros · demanda total</p>
              <LoadCurveChart series={[{ label: 'Potencia (kW)', color: 'var(--color-accent)', points }]} />
            </div>
          </div>
        </QueryStateView>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <h2 className="text-sm font-semibold text-card-fg">Comparativa entre centros</h2>
        <p className="mb-3 text-xs text-card-muted">Elige los centros para contrastar su patrón</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {fleet.centros.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCentro(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${centrosSeleccionados.has(c.id) ? 'text-white' : 'border border-border text-foreground hover:bg-surface'}`}
              style={centrosSeleccionados.has(c.id) ? { backgroundColor: CENTRO_COLORS[i % CENTRO_COLORS.length] } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>
        <QueryStateView phase={loadCurves.phase} error={null} variant="widget">
          {centrosSeleccionados.size > 0 && (
            <LoadCurveChart
              series={fleet.centros
                .map((c, i) => ({ centro: c, color: CENTRO_COLORS[i % CENTRO_COLORS.length] }))
                .filter(({ centro }) => centrosSeleccionados.has(centro.id))
                .map(({ centro, color }) => ({ label: centro.name, color, points: inFranja(loadCurves.curves.get(centro.id) ?? [], franja) }))}
            />
          )}
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
