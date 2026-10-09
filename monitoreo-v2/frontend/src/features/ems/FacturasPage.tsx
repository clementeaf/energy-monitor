import { useState } from 'react';
import { CENTROS } from './mock-data';

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

interface MockFactura {
  id: string;
  numero: string;
  centro: string;
  centroId: string;
  periodo: string;
  emision: string;
  neto: number;
  iva: number;
  total: number;
  estado: 'pagada' | 'pendiente' | 'vencida';
  vencimiento: string;
}

const FACTURAS: MockFactura[] = [
  { id: 'f1', numero: 'FE-2026-0091', centro: 'Centro Costanera', centroId: 'c1', periodo: 'Sep 2026', emision: '2026-09-01', neto: 21100000, iva: 4009000, total: 25109000, estado: 'pendiente', vencimiento: '2026-09-30' },
  { id: 'f2', numero: 'FE-2026-0092', centro: 'Sucursal Maipú', centroId: 'c2', periodo: 'Sep 2026', emision: '2026-09-01', neto: 11100000, iva: 2109000, total: 13209000, estado: 'pendiente', vencimiento: '2026-09-30' },
  { id: 'f3', numero: 'FE-2026-0093', centro: 'Planta Quilicura', centroId: 'c3', periodo: 'Sep 2026', emision: '2026-09-01', neto: 39200000, iva: 7448000, total: 46648000, estado: 'pendiente', vencimiento: '2026-09-30' },
  { id: 'f4', numero: 'FE-2026-0094', centro: 'Centro Vitacura', centroId: 'c4', periodo: 'Sep 2026', emision: '2026-09-01', neto: 8400000, iva: 1596000, total: 9996000, estado: 'pendiente', vencimiento: '2026-09-30' },
  { id: 'f5', numero: 'FE-2026-0095', centro: 'Bodega San Bernardo', centroId: 'c5', periodo: 'Sep 2026', emision: '2026-09-01', neto: 15000000, iva: 2850000, total: 17850000, estado: 'pendiente', vencimiento: '2026-09-30' },
  { id: 'f6', numero: 'FE-2026-0096', centro: 'Local Providencia', centroId: 'c6', periodo: 'Sep 2026', emision: '2026-09-01', neto: 5100000, iva: 969000, total: 6069000, estado: 'pendiente', vencimiento: '2026-09-30' },
  { id: 'f7', numero: 'FE-2026-0085', centro: 'Centro Costanera', centroId: 'c1', periodo: 'Ago 2026', emision: '2026-08-01', neto: 20200000, iva: 3838000, total: 24038000, estado: 'pagada', vencimiento: '2026-08-31' },
  { id: 'f8', numero: 'FE-2026-0086', centro: 'Planta Quilicura', centroId: 'c3', periodo: 'Ago 2026', emision: '2026-08-01', neto: 37800000, iva: 7182000, total: 44982000, estado: 'pagada', vencimiento: '2026-08-31' },
  { id: 'f9', numero: 'FE-2026-0087', centro: 'Bodega San Bernardo', centroId: 'c5', periodo: 'Ago 2026', emision: '2026-08-01', neto: 14500000, iva: 2755000, total: 17255000, estado: 'vencida', vencimiento: '2026-08-31' },
];

const ESTADO_CLS: Record<string, string> = {
  pagada: 'bg-success-bg text-success',
  pendiente: 'bg-warning-bg text-warning',
  vencida: 'bg-danger-bg text-danger',
};

const ESTADO_LABEL: Record<string, string> = {
  pagada: 'Pagada',
  pendiente: 'Pendiente',
  vencida: 'Vencida',
};

function descargarPdf(factura: MockFactura) {
  const centro = CENTROS.find((c) => c.id === factura.centroId);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${factura.numero}</title>
<style>
  body { font-family: 'Geist', system-ui, sans-serif; margin: 40px; color: #131816; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .subtitle { color: #727C78; font-size: 13px; margin-bottom: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo { background: #062C23; color: #9FD838; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #727C78; padding: 8px 12px; border-bottom: 2px solid #DDE4E1; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #ECF0EE; }
  .mono { font-family: 'Geist Mono', monospace; }
  .right { text-align: right; }
  .total-row td { font-weight: 700; border-top: 2px solid #131816; border-bottom: none; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .meta-item { font-size: 12px; }
  .meta-label { color: #727C78; margin-bottom: 2px; }
  .meta-value { font-weight: 600; }
  .footer { margin-top: 40px; font-size: 11px; color: #727C78; border-top: 1px solid #DDE4E1; padding-top: 16px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<div class="header">
  <div>
    <h1>Factura ${factura.numero}</h1>
    <div class="subtitle">POWER Digital® EMS — Globe Power SpA</div>
  </div>
  <div class="logo">⚡ POWER Digital</div>
</div>
<div class="meta">
  <div class="meta-item"><div class="meta-label">Centro</div><div class="meta-value">${factura.centro}</div></div>
  <div class="meta-item"><div class="meta-label">Cliente</div><div class="meta-value">${centro?.cliente ?? '—'}</div></div>
  <div class="meta-item"><div class="meta-label">Periodo</div><div class="meta-value">${factura.periodo}</div></div>
  <div class="meta-item"><div class="meta-label">Emisión</div><div class="meta-value">${factura.emision}</div></div>
  <div class="meta-item"><div class="meta-label">Vencimiento</div><div class="meta-value">${factura.vencimiento}</div></div>
  <div class="meta-item"><div class="meta-label">Estado</div><div class="meta-value">${ESTADO_LABEL[factura.estado]}</div></div>
</div>
<table>
  <thead><tr><th>Concepto</th><th class="right">Cantidad</th><th class="right">Precio unit.</th><th class="right">Subtotal</th></tr></thead>
  <tbody>
    <tr><td>Energía consumida</td><td class="right mono">${fmt(centro?.consumoMes ?? 0, 1)} MWh</td><td class="right mono">$${fmt(Math.round((factura.neto * 0.7) / (centro?.consumoMes ?? 1)), 0)}/MWh</td><td class="right mono">$${fmt(Math.round(factura.neto * 0.7))}</td></tr>
    <tr><td>Demanda máxima</td><td class="right mono">1 mes</td><td class="right mono">$${fmt(Math.round(factura.neto * 0.2))}</td><td class="right mono">$${fmt(Math.round(factura.neto * 0.2))}</td></tr>
    <tr><td>Cargo fijo</td><td class="right mono">1</td><td class="right mono">$${fmt(Math.round(factura.neto * 0.1))}</td><td class="right mono">$${fmt(Math.round(factura.neto * 0.1))}</td></tr>
    <tr><td colspan="3" class="right"><strong>Neto</strong></td><td class="right mono"><strong>$${fmt(factura.neto)}</strong></td></tr>
    <tr><td colspan="3" class="right">IVA 19%</td><td class="right mono">$${fmt(factura.iva)}</td></tr>
    <tr class="total-row"><td colspan="3" class="right">TOTAL</td><td class="right mono">$${fmt(factura.total)}</td></tr>
  </tbody>
</table>
<div class="footer">
  <p>Globe Power SpA · RUT 77.XXX.XXX-X · Av. Apoquindo 4700, Of. 1201, Las Condes, Santiago</p>
  <p>Documento tributario electrónico — Este PDF es una representación impresa de la factura electrónica.</p>
</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.onload = () => {
      setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 300);
    };
  }
}

export function FacturasPage() {
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'pagada' | 'vencida'>('todas');

  const filtered = filtro === 'todas' ? FACTURAS : FACTURAS.filter((f) => f.estado === filtro);
  const totalNeto = filtered.reduce((s, f) => s + f.neto, 0);
  const totalTotal = filtered.reduce((s, f) => s + f.total, 0);
  const pendientes = FACTURAS.filter((f) => f.estado === 'pendiente');
  const vencidas = FACTURAS.filter((f) => f.estado === 'vencida');

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:overflow-hidden md:p-6">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Facturas</h1>
          <p className="text-xs text-muted">{FACTURAS.length} facturas emitidas</p>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Pendientes" value={String(pendientes.length)} sub={`$${fmt(pendientes.reduce((s, f) => s + f.total, 0))} total`} />
        <KpiCard label="Vencidas" value={String(vencidas.length)} sub={vencidas.length > 0 ? `$${fmt(vencidas.reduce((s, f) => s + f.total, 0))}` : 'Sin vencidas'} negative={vencidas.length > 0} />
        <KpiCard label="Facturado del mes" value={`$${fmt(totalNeto)}`} sub="Neto" />
        <KpiCard label="Total con IVA" value={`$${fmt(totalTotal)}`} />
      </div>

      <div className="flex shrink-0 gap-1">
        {(['todas', 'pendiente', 'pagada', 'vencida'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${filtro === f ? 'bg-brand text-brand-fg' : 'border border-border text-muted hover:bg-surface'}`}>
            {f === 'todas' ? 'Todas' : ESTADO_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-card-border bg-card">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-card-border">
                <Th>N° Factura</Th>
                <Th>Centro</Th>
                <Th>Periodo</Th>
                <Th>Neto</Th>
                <Th>IVA</Th>
                <Th>Total</Th>
                <Th>Vencimiento</Th>
                <Th>Estado</Th>
                <Th>PDF</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-surface">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-foreground">{f.numero}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{f.centro}</td>
                  <td className="px-4 py-3 text-sm text-muted">{f.periodo}</td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground tabular-nums">${fmt(f.neto)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted tabular-nums">${fmt(f.iva)}</td>
                  <td className="px-4 py-3 font-mono text-sm font-medium text-foreground tabular-nums">${fmt(f.total)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted tabular-nums">{f.vencimiento}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLS[f.estado]}`}>
                      {ESTADO_LABEL[f.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => descargarPdf(f)} className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-accent-strong" title="Descargar PDF">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, negative }: Readonly<{ label: string; value: string; sub?: string; negative?: boolean }>) {
  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="text-xs text-card-muted">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${negative ? 'text-danger' : 'text-card-fg'}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">{children}</th>;
}
