import { useState } from 'react';
import { CENTROS, CURVA_CARGA_GLOBAL } from './mock-data';

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

type Franja = 'todas' | 'hoy' | '7dias' | '30dias' | 'punta' | 'valle';

const FRANJA_TABS: { key: Franja; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7dias', label: '7 días' },
  { key: '30dias', label: '30 días' },
  { key: 'todas', label: 'Todas las franjas' },
  { key: 'punta', label: 'Punta 18–23 h' },
  { key: 'valle', label: 'Valle 00–07 h' },
];

const CURVAS_CENTRO: Record<string, number[]> = {
  c1: [20, 25, 30, 37, 75, 133, 195, 250, 290, 320, 310, 298, 275, 263, 270, 285, 304, 325, 271, 210, 165, 124, 83, 48],
  c2: [5, 6, 7, 9, 20, 38, 62, 80, 95, 105, 100, 98, 90, 85, 88, 92, 98, 104, 88, 65, 50, 38, 25, 15],
  c3: [45, 50, 55, 63, 145, 265, 355, 440, 510, 560, 548, 530, 490, 468, 478, 500, 530, 565, 480, 375, 295, 225, 155, 90],
  c4: [4, 5, 6, 7, 18, 32, 52, 68, 80, 90, 85, 82, 75, 70, 72, 78, 82, 88, 74, 55, 42, 32, 22, 12],
  c5: [33, 37, 41, 47, 108, 197, 265, 330, 380, 195, 190, 185, 172, 165, 168, 175, 185, 198, 170, 130, 100, 78, 55, 32],
  c6: [3, 4, 4, 5, 12, 22, 35, 45, 55, 62, 60, 58, 52, 48, 50, 54, 58, 62, 52, 38, 28, 22, 15, 8],
};

const CENTRO_COLORS = ['var(--color-accent)', 'var(--color-warning)', 'var(--color-danger)', 'var(--color-info)', '#a78bfa', '#f472b6'];

export function ConsumoPage() {
  const [franja, setFranja] = useState<Franja>('todas');
  const [centrosSeleccionados, setCentrosSeleccionados] = useState<Set<string>>(new Set(['c1', 'c3']));

  const peak = Math.max(...CURVA_CARGA_GLOBAL);
  const promedio = Math.round(CURVA_CARGA_GLOBAL.reduce((a, b) => a + b, 0) / CURVA_CARGA_GLOBAL.filter((v) => v > 0).length);
  const factorCarga = peak > 0 ? (promedio / peak) * 100 : 0;

  const toggleCentro = (id: string) => {
    setCentrosSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Consumo</h1>
          <p className="text-xs text-muted">Picos y curvas de carga</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {FRANJA_TABS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFranja(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${franja === f.key ? 'bg-accent text-accent-ink' : 'border border-border text-foreground hover:bg-surface'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
          ↓ Exportar serie
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Pico de demanda" value={fmt(peak)} unit="kWh" sub="↑ Máximo del periodo" positive />
        <KpiCard label="Consumo medio" value={fmt(promedio)} unit="kWh" sub="Promedio por punto" />
        <KpiCard label="Factor de carga" value={fmt(factorCarga, 1)} unit="%" sub="Media / pico" />
        <KpiCard label="Puntos de la serie" value={String(CURVA_CARGA_GLOBAL.length)} sub="Serie completa" />
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold text-card-fg">Curva de carga agregada</h2>
          <p className="text-xs text-card-muted">Todos los centros · por hora</p>
        </div>
        <LineChart data={CURVA_CARGA_GLOBAL} color="var(--color-accent)" />
        <div className="mt-2 flex items-center gap-1.5 px-1">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: 'var(--color-accent)' }} />
          <span className="text-[10px] text-card-muted">Consumo (kWh)</span>
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold text-card-fg">Comparativa entre centros</h2>
          <p className="mb-3 text-xs text-card-muted">Elige dos centros para contrastar su patrón</p>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {CENTROS.map((c, i) => (
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
        {centrosSeleccionados.size > 0 && (
          <MultiLineChart
            series={CENTROS.filter((c) => centrosSeleccionados.has(c.id)).map((c, i) => ({
              data: CURVAS_CENTRO[c.id] ?? CURVA_CARGA_GLOBAL,
              color: CENTRO_COLORS[CENTROS.findIndex((x) => x.id === c.id) % CENTRO_COLORS.length],
              label: c.name,
            }))}
          />
        )}
      </div>
    </div>
  );
}

function LineChart({ data, color }: Readonly<{ data: number[]; color: string }>) {
  const max = Math.max(...data, 1);
  const W = 700;
  const H = 200;
  const padTop = 10;
  const padBottom = 22;
  const padX = 40;
  const chartW = W - padX;
  const chartH = H - padTop - padBottom;
  const baseline = padTop + chartH;

  const points = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padTop + chartH - (v / max) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padTop + chartH - pct * chartH,
    label: fmt(Math.round(max * pct)),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" preserveAspectRatio="xMidYMid meet">
      {yTicks.map((t) => (
        <g key={t.y}>
          <line x1={padX} y1={t.y} x2={W} y2={t.y} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x={padX - 4} y={t.y + 3} textAnchor="end" fill="var(--color-muted)" fontSize="8" fontFamily="var(--font-mono)">{t.label}</text>
        </g>
      ))}
      <line x1={padX} y1={baseline} x2={W} y2={baseline} stroke="var(--color-border)" strokeWidth="0.5" />
      {data.map((_, i) => i % 3 === 0 ? (
        <text key={i} x={points[i].x} y={baseline + 14} textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontFamily="var(--font-mono)">
          {String(i).padStart(2, '0')}:00
        </text>
      ) : null)}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function MultiLineChart({ series }: Readonly<{ series: { data: number[]; color: string; label: string }[] }>) {
  const allData = series.flatMap((s) => s.data);
  const max = Math.max(...allData, 1);
  const W = 700;
  const H = 200;
  const padTop = 10;
  const padBottom = 22;
  const padX = 40;
  const chartW = W - padX;
  const chartH = H - padTop - padBottom;
  const baseline = padTop + chartH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padTop + chartH - pct * chartH,
    label: fmt(Math.round(max * pct)),
  }));

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" preserveAspectRatio="xMidYMid meet">
        {yTicks.map((t) => (
          <g key={t.y}>
            <line x1={padX} y1={t.y} x2={W} y2={t.y} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={padX - 4} y={t.y + 3} textAnchor="end" fill="var(--color-muted)" fontSize="8" fontFamily="var(--font-mono)">{t.label}</text>
          </g>
        ))}
        <line x1={padX} y1={baseline} x2={W} y2={baseline} stroke="var(--color-border)" strokeWidth="0.5" />
        {Array.from({ length: 24 }).map((_, i) => i % 3 === 0 ? (
          <text key={i} x={padX + (i / 23) * chartW} y={baseline + 14} textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontFamily="var(--font-mono)">
            {String(i).padStart(2, '0')}:00
          </text>
        ) : null)}
        {series.map((s) => {
          const points = s.data.map((v, i) => ({
            x: padX + (i / (s.data.length - 1)) * chartW,
            y: padTop + chartH - (v / max) * chartH,
          }));
          const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return <path key={s.label} d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />;
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 px-1">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-card-muted">{s.label}</span>
          </span>
        ))}
      </div>
    </>
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
