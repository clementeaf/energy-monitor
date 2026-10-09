import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { CENTROS } from './mock-data';
import { SortableTh, sortRows, useSort } from './table';

type SortKey = 'nombre' | 'compra' | 'venta' | 'margen' | 'pct';
type CentroMargen = typeof CENTROS[number];

const SORT_GETTERS: Record<SortKey, (c: CentroMargen) => string | number> = {
  nombre: (c) => c.name,
  compra: (c) => c.costoCompra,
  venta: (c) => c.precioVenta,
  margen: (c) => c.margen,
  pct: (c) => c.margenPct,
};

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

type Vista = 'monto' | 'porcentaje';

const VISTA_CHART: Record<Vista, { title: string; sub: string; value: (c: CentroMargen) => number; label: (c: CentroMargen) => string }> = {
  monto: { title: 'Margen en monto', sub: 'Millones de pesos', value: (c) => c.margen, label: (c) => `$${fmt(c.margen, 1)}M` },
  porcentaje: { title: 'Margen porcentual', sub: 'Porcentaje sobre la venta', value: (c) => c.margenPct, label: (c) => `${fmt(c.margenPct, 1)}%` },
};

export function MargenesPage() {
  const [vista, setVista] = useState<Vista>('monto');
  const minimoContractual = useAppStore((s) => s.margenMinimo);
  const setMinimoContractual = useAppStore((s) => s.setMargenMinimo);

  const totalCompra = CENTROS.reduce((s, c) => s + c.costoCompra, 0);
  const totalVenta = CENTROS.reduce((s, c) => s + c.precioVenta, 0);
  const totalMargen = CENTROS.reduce((s, c) => s + c.margen, 0);
  const margenPct = totalVenta > 0 ? (totalMargen / totalVenta) * 100 : 0;
  const centrosBajoMinimo = CENTROS.filter((c) => c.margenPct < minimoContractual).length;

  const showToast = useToastStore((s) => s.showToast);
  const { sort, toggleSort } = useSort<SortKey>({ key: 'margen', direction: 'desc' });
  const centrosOrdenados = sortRows(CENTROS, sort, SORT_GETTERS);
  const maxVenta = Math.max(...CENTROS.map((c) => c.precioVenta));
  const chart = VISTA_CHART[vista];
  const maxChart = Math.max(...CENTROS.map(chart.value));

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Márgenes</h1>
          <p className="text-xs text-muted">Costo de compra contra precio de venta</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setVista('monto')}
              className={`px-3 py-1.5 text-xs font-medium rounded-l-lg ${vista === 'monto' ? 'bg-card-fg text-card' : 'text-muted hover:bg-surface'}`}
            >
              Monto
            </button>
            <button
              type="button"
              onClick={() => setVista('porcentaje')}
              className={`px-3 py-1.5 text-xs font-medium rounded-r-lg ${vista === 'porcentaje' ? 'bg-card-fg text-card' : 'text-muted hover:bg-surface'}`}
            >
              Porcentaje
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Mínimo contractual</span>
            <input
              type="number"
              min={0}
              max={60}
              value={minimoContractual}
              onChange={(e) => setMinimoContractual(Number(e.target.value))}
              className="w-12 rounded border border-border bg-surface px-2 py-1 text-center font-mono text-xs text-foreground focus:border-accent focus:outline-none"
            />
            <span>%</span>
          </div>
        </div>
        <button type="button" onClick={() => showToast('Exportando el detalle de márgenes…')} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
          ↓ Exportar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Ingreso por venta" value={`$${fmt(totalVenta, 1)}M`} delta={`↑ 3,4% vs agosto`} positive />
        <KpiCard label="Costo de compra" value={`$${fmt(totalCompra, 1)}M`} delta={`↑ 3,1% vs agosto`} />
        <KpiCard label="Margen bruto" value={`$${fmt(totalMargen, 1)}M`} delta={`↑ ${fmt(margenPct, 1)}% sobre venta`} positive />
        <KpiCard label="Centros bajo el mínimo" value={String(centrosBajoMinimo)} delta={centrosBajoMinimo > 0 ? `↓ Mínimo ${minimoContractual}%` : `Mínimo ${minimoContractual}%`} negative={centrosBajoMinimo > 0} />
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-card-border">
                <SortableTh label="Centro" sortKey="nombre" sort={sort} onToggle={toggleSort} />
                <SortableTh label="Compra" sortKey="compra" sort={sort} onToggle={toggleSort} />
                <SortableTh label="Venta" sortKey="venta" sort={sort} onToggle={toggleSort} />
                <SortableTh label="Margen" sortKey="margen" sort={sort} onToggle={toggleSort} />
                <SortableTh label="%" sortKey="pct" sort={sort} onToggle={toggleSort} />
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {centrosOrdenados.map((c) => {
                const sobreMinimo = c.margenPct >= minimoContractual;
                return (
                  <tr key={c.id} className="hover:bg-surface">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted">{c.cliente}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground tabular-nums">${fmt(c.costoCompra, 1)}M</td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground tabular-nums">${fmt(c.precioVenta, 1)}M</td>
                    <td className="px-4 py-3 font-mono text-sm font-medium text-foreground tabular-nums">${fmt(c.margen, 1)}M</td>
                    <td className={`px-4 py-3 font-mono text-sm tabular-nums ${sobreMinimo ? 'text-success' : 'text-danger'}`}>{fmt(c.margenPct, 1)}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${sobreMinimo ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg'}`}>
                        {sobreMinimo ? '✓' : '✕'} {sobreMinimo ? 'Sobre el mínimo' : 'Bajo el mínimo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-card-border bg-card p-4">
          <h2 className="text-sm font-semibold text-card-fg">Compra vs venta</h2>
          <p className="mb-4 text-xs text-card-muted">La barra completa es el precio de venta</p>
          <div className="space-y-3">
            {centrosOrdenados.map((c) => {
              const compraPct = (c.costoCompra / maxVenta) * 100;
              const margenPctBarra = ((c.precioVenta - c.costoCompra) / maxVenta) * 100;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-36 truncate text-xs text-card-fg">{c.name}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded-full">
                    <div className="h-full bg-subtle" style={{ width: `${compraPct}%` }} />
                    <div className="h-full bg-accent" style={{ width: `${margenPctBarra}%` }} />
                  </div>
                  <span className="w-14 text-right font-mono text-xs text-card-muted tabular-nums">${fmt(c.precioVenta, 1)}M</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] text-card-muted">
              <span className="h-2 w-3 rounded-sm bg-subtle" /> Costo de compra
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-card-muted">
              <span className="h-2 w-3 rounded-sm bg-accent" /> Margen
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-4">
          <h2 className="text-sm font-semibold text-card-fg">{chart.title}</h2>
          <p className="mb-4 text-xs text-card-muted">{chart.sub}</p>
          <div className="space-y-3">
            {centrosOrdenados.map((c) => {
              const pct = (chart.value(c) / maxChart) * 100;
              const color = c.margenPct >= minimoContractual ? 'var(--color-accent)' : 'var(--color-danger)';
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-36 truncate text-xs text-card-fg">{c.name}</span>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-raised">
                      <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                  <span className="w-14 text-right font-mono text-xs text-card-muted tabular-nums">{chart.label(c)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta, positive, negative }: Readonly<{
  label: string; value: string; delta?: string; positive?: boolean; negative?: boolean;
}>) {
  const deltaColor = negative ? 'text-danger' : positive ? 'text-success' : 'text-muted';
  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="text-xs text-card-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-card-fg tabular-nums">{value}</p>
      {delta && <p className={`mt-1 text-[11px] ${deltaColor}`}>{delta}</p>}
    </div>
  );
}
