import { useState } from 'react';

/* ── Placeholder data ── */

const SLO_DIMENSIONS = [
  { dimension: 'Completitud', objetivo: '≥ 99%', actual: '99.4%', estado: 'cumple', tend: '↑ +0.2%' },
  { dimension: 'Puntualidad', objetivo: '≤ 5 min lag', actual: '42 s', estado: 'cumple', tend: '→ estable' },
  { dimension: 'Exactitud', objetivo: '≥ 99.5%', actual: '99.1%', estado: 'incumple', tend: '↓ -0.4%' },
  { dimension: 'Disponibilidad API', objetivo: '≥ 99.9%', actual: '99.95%', estado: 'cumple', tend: '↑ +0.05%' },
  { dimension: 'Latencia p95', objetivo: '≤ 500 ms', actual: '487 ms', estado: 'cumple', tend: '↑ -13 ms' },
  { dimension: 'Integridad ref.', objetivo: '100%', actual: '100%', estado: 'cumple', tend: '→ estable' },
];

const SLO_BREACHES = [
  {
    dimension: 'Exactitud',
    periodo: '2026-07-01 → 2026-07-07',
    objetivo: '≥ 99.5%',
    valorReal: '99.1%',
    causaRaiz: 'Desfase de reloj en sensor zona B2',
    accion: 'NTP re-sync desplegado',
  },
  {
    dimension: 'Puntualidad',
    periodo: '2026-06-25 → 2026-06-26',
    objetivo: '≤ 5 min',
    valorReal: '12 min',
    causaRaiz: 'Saturación Redis durante deploy',
    accion: 'ElastiCache tier aumentado',
  },
  {
    dimension: 'Latencia p95',
    periodo: '2026-06-18',
    objetivo: '≤ 500 ms',
    valorReal: '620 ms',
    causaRaiz: 'Query sin índice en readings_daily',
    accion: 'Índice compuesto agregado (migración 55)',
  },
];

/* SVG latency chart */
const LATENCY_POINTS = [320, 280, 410, 495, 487, 310, 380, 420, 460, 487, 390, 330, 450, 487, 400];
const W = 400;
const H = 120;
const PAD = { top: 12, right: 12, bottom: 20, left: 36 };
const chartW = W - PAD.left - PAD.right;
const chartH = H - PAD.top - PAD.bottom;
const maxVal = 700;

function toX(i: number, n: number) {
  return PAD.left + (i / (n - 1)) * chartW;
}
function toY(v: number) {
  return PAD.top + chartH - (v / maxVal) * chartH;
}

const polyline = LATENCY_POINTS.map((v, i) => `${toX(i, LATENCY_POINTS.length)},${toY(v)}`).join(' ');
const thresholdY = toY(500);

/* ── Page ── */

export function SlosDatosPage() {
  const [expandedBreach, setExpandedBreach] = useState<number | null>(null);
  const [form, setForm] = useState({
    dimension: '',
    tipo: 'critico',
    objetivo: '',
    ventana: '7d',
    umbral: '',
  });

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-lg font-semibold text-foreground">7.7 SLOs de Datos</h1>
        <p className="text-[12px] text-muted">Objetivos de nivel de servicio para datos — cumplimiento, historial de incumplimientos y configuración</p>
      </div>

      {/* Row 1 — compact */}
      <div className="flex shrink-0 gap-3">
        {/* SLOs por dimensión */}
        <div className="panel min-w-0 flex-1 p-4">
          <h3 className="text-[13px] font-semibold text-foreground">SLOs por dimensión de dato</h3>
          <p className="mb-2 text-[11px] text-muted">objetivo vs. actual · estado (cumple/incumple) · tendencia 7 días</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Dimensión</th>
                <th className="sticky top-0 bg-white px-3 py-2">Objetivo</th>
                <th className="sticky top-0 bg-white px-3 py-2">Actual</th>
                <th className="sticky top-0 bg-white px-3 py-2">Estado</th>
                <th className="sticky top-0 bg-white px-3 py-2">Tend. 7d</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SLO_DIMENSIONS.map((s, i) => (
                <tr key={s.dimension} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-3 py-2 font-medium text-foreground">{s.dimension}</td>
                  <td className="px-3 py-2 text-[11px] text-muted font-mono">{s.objetivo}</td>
                  <td className="px-3 py-2 text-[11px] font-mono font-medium text-foreground">{s.actual}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.estado === 'cumple' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {s.estado}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-[11px] ${s.tend.startsWith('↑') ? 'text-emerald-600' : s.tend.startsWith('↓') ? 'text-red-500' : 'text-muted'}`}>
                    {s.tend}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-26]</span>
        </div>

        {/* Latency chart */}
        <div className="panel min-w-0 flex-1 flex flex-col p-4">
          <div className="shrink-0">
            <h3 className="text-[13px] font-semibold text-foreground">SLO de latencia de API — p95</h3>
            <p className="mb-2 text-[11px] text-muted">umbral contractual 500 ms · badge rojo si lo supera (INT-08)</p>
            <div className="mb-2 flex items-center gap-3">
              <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                487 ms — dentro de umbral
              </span>
              <span className="text-[11px] text-muted">umbral: 500 ms</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-h-0 flex-1" preserveAspectRatio="none">
            {/* Grid */}
            {[0, 200, 400, 600].map((v) => (
              <line
                key={v}
                x1={PAD.left}
                x2={W - PAD.right}
                y1={toY(v)}
                y2={toY(v)}
                stroke="#e5e7eb"
                strokeWidth={0.5}
              />
            ))}
            {/* Threshold line */}
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={thresholdY}
              y2={thresholdY}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="5,3"
            />
            <text x={W - PAD.right - 2} y={thresholdY - 3} textAnchor="end" fontSize={9} fill="#ef4444">500 ms umbral</text>
            {/* Line */}
            <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
            {/* Dots */}
            {LATENCY_POINTS.map((v, i) => (
              <circle
                key={i}
                cx={toX(i, LATENCY_POINTS.length)}
                cy={toY(v)}
                r={2.5}
                fill={v > 500 ? '#ef4444' : '#3b82f6'}
              />
            ))}
            {/* Y labels */}
            {[0, 200, 400, 600].map((v) => (
              <text key={v} x={PAD.left - 4} y={toY(v) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">{v}</text>
            ))}
          </svg>
          <div className="flex shrink-0 items-center justify-between pt-1">
            <p className="text-[10px] text-muted">últimas 15 mediciones · ms</p>
            <span className="text-[10px] text-muted">[INT-08, DAT-26]</span>
          </div>
        </div>
      </div>

      {/* Row 2 — fills remaining space */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Historial de incumplimientos */}
        <div className="panel min-w-0 flex-1 flex min-h-0 flex-col">
          <div className="shrink-0 p-4 pb-2">
            <h3 className="text-[13px] font-semibold text-foreground">Historial de incumplimientos de SLO</h3>
            <p className="text-[11px] text-muted">causa raíz registrada · exportable para revisión con PASA</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Dimensión</th>
                <th className="sticky top-0 bg-white px-3 py-2">Período</th>
                <th className="sticky top-0 bg-white px-3 py-2">Objetivo</th>
                <th className="sticky top-0 bg-white px-3 py-2">Valor real</th>
                <th className="sticky top-0 bg-white px-3 py-2">Causa raíz</th>
                <th className="sticky top-0 bg-white px-3 py-2">Acción</th>
                <th className="sticky top-0 bg-white px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SLO_BREACHES.map((b, i) => (
                <>
                  <tr
                    key={i}
                    className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setExpandedBreach(expandedBreach === i ? null : i)}
                  >
                    <td className="px-3 py-2 font-medium text-foreground">{b.dimension}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{b.periodo}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-muted">{b.objetivo}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-red-600">{b.valorReal}</td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-[11px] text-muted">{b.causaRaiz}</td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-[11px] text-emerald-600">{b.accion}</td>
                    <td className="px-3 py-2 text-[10px] text-brand">{expandedBreach === i ? '▲' : '▼'}</td>
                  </tr>
                  {expandedBreach === i && (
                    <tr key={`${i}-detail`}>
                      <td colSpan={7} className="bg-surface px-4 py-3">
                        <div className="grid grid-cols-2 gap-4 text-[12px]">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Causa raíz completa</p>
                            <p className="text-muted">{b.causaRaiz}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Acción correctiva</p>
                            <p className="text-emerald-700">{b.accion}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          </div>
          <span className="block shrink-0 border-t border-border px-4 py-1.5 text-right text-[10px] text-muted">[DAT-26, FIN-06, DAT-14]</span>
        </div>

        {/* Configurador de SLOs */}
        <div className="panel min-w-0 flex-1 flex min-h-0 flex-col">
          <div className="shrink-0 px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-foreground">Configurador de SLOs</h3>
            <p className="text-[11px] text-muted">los valores no pueden bajar de los mínimos contractuales · cada cambio auditado</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Dimensión de dato</label>
              <select
                className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground"
                value={form.dimension}
                onChange={(e) => setForm({ ...form, dimension: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {SLO_DIMENSIONS.map((s) => <option key={s.dimension} value={s.dimension}>{s.dimension}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Tipo de dato</label>
              <select
                className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="critico">Medidor crítico</option>
                <option value="contexto">Contexto</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Valor objetivo</label>
              <input
                className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground"
                placeholder="ej. 99.5%"
                value={form.objetivo}
                onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Ventana de evaluación</label>
              <select
                className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground"
                value={form.ventana}
                onChange={(e) => setForm({ ...form, ventana: e.target.value })}
              >
                <option value="1d">1 día</option>
                <option value="7d">7 días</option>
                <option value="30d">30 días</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Umbral de alerta</label>
              <input
                className="w-full rounded border border-border bg-white px-2 py-1.5 text-[13px] text-foreground"
                placeholder="ej. 99.0%"
                value={form.umbral}
                onChange={(e) => setForm({ ...form, umbral: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand/90">
                Guardar SLO
              </button>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted hover:bg-surface">
                Cancelar
              </button>
            </div>
          </form>
          </div>
          <span className="block shrink-0 px-4 pb-2 text-right text-[10px] text-muted">[DAT-26]</span>
        </div>
      </div>
    </div>
  );
}
