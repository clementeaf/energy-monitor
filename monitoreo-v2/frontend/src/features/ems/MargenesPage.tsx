import { useState } from 'react';
import { CENTROS } from './mock-data';

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

type Vista = 'monto' | 'porcentaje';

export function MargenesPage() {
  const [vista, setVista] = useState<Vista>('monto');
  const [minimoContractual, setMinimoContractual] = useState(10);

  const totalCompra = CENTROS.reduce((s, c) => s + c.costoCompra, 0);
  const totalVenta = CENTROS.reduce((s, c) => s + c.precioVenta, 0);
  const totalMargen = CENTROS.reduce((s, c) => s + c.margen, 0);
  const margenPct = totalVenta > 0 ? (totalMargen / totalVenta) * 100 : 0;
  const centrosBajoMinimo = CENTROS.filter((c) => c.margenPct < minimoContractual).length;

  const centrosOrdenados = [...CENTROS].sort((a, b) => b.margenPct - a.margenPct);
  const maxVenta = Math.max(...CENTROS.map((c) => c.precioVenta));
  const maxMargen = Math.max(...CENTROS.map((c) => c.margen));

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Márgenes</h1>
          <p className="text-xs text-muted">Costo de compra contra precio de venta</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
              value={minimoContractual}
              onChange={(e) => setMinimoContractual(Number(e.target.value))}
              className="w-12 rounded border border-border bg-surface px-2 py-1 text-center font-mono text-xs text-foreground focus:border-accent focus:outline-none"
            />
            <span>%</span>
          </div>
        </div>
        <button type="button" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
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
                <Th>Centro</Th>
                <Th>Compra</Th>
                <Th>Venta</Th>
                <Th accent>Margen</Th>
                <Th>%</Th>
                <Th>Estado</Th>
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
                    <td className="px-4 py-3 font-mono text-sm text-accent tabular-nums">{fmt(c.margenPct, 1)}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${sobreMinimo ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg'}`}>
                        {sobreMinimo ? '✓' : '✕'} {sobreMinimo ? 'Sobre el mínimo' : 'Alarma'}
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
              const ventaPct = (c.precioVenta / maxVenta) * 100;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-36 truncate text-xs text-card-fg">{c.name}</span>
                  <div className="relative flex-1 h-3">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-raised" style={{ width: `${ventaPct}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${compraPct}%` }} />
                  </div>
                  <span className="w-14 text-right font-mono text-xs text-card-muted tabular-nums">${fmt(c.precioVenta, 1)}M</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] text-card-muted">
              <span className="h-2 w-3 rounded-sm bg-raised" /> Costo de compra
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-card-muted">
              <span className="h-2 w-3 rounded-sm bg-accent" /> Margen
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-4">
          <h2 className="text-sm font-semibold text-card-fg">Margen en monto</h2>
          <p className="mb-4 text-xs text-card-muted">Millones de pesos</p>
          <div className="space-y-3">
            {centrosOrdenados.map((c) => {
              const pct = (c.margen / maxMargen) * 100;
              const color = c.margenPct >= minimoContractual ? 'var(--color-accent)' : 'var(--color-danger)';
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-36 truncate text-xs text-card-fg">{c.name}</span>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-raised">
                      <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                  <span className="w-14 text-right font-mono text-xs text-card-muted tabular-nums">${fmt(c.margen, 1)}M</span>
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

function Th({ children, accent }: Readonly<{ children: React.ReactNode; accent?: boolean }>) {
  return <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider ${accent ? 'text-accent' : 'text-muted'}`}>{children}</th>;
}
