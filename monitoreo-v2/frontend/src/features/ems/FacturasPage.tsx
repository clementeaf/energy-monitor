import { useMemo, useState } from 'react';
import { QueryStateView } from '../../components/ui/QueryStateView';
import type { Centro } from './fleet';
import { formatPeriodo } from './format';
import { useEmsFleet } from './useEmsFleet';

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

type EstadoFactura = 'pagada' | 'pendiente' | 'vencida';

export interface Factura {
  id: string;
  numero: string;
  centro: string;
  cliente: string;
  periodo: string;
  emision: string;
  vencimiento: string;
  consumoMwh: number;
  precioMwh: number;
  neto: number;
  iva: number;
  total: number;
  estado: EstadoFactura;
}

const IVA = 0.19;
const DIAS_PARA_PAGAR = 30;

function toIsoDate(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

export function buildFacturas(centros: Centro[], periodo: Date, hoy: Date): Factura[] {
  const emision = new Date(periodo.getFullYear(), periodo.getMonth() + 1, 1);
  const vencimiento = new Date(emision.getFullYear(), emision.getMonth(), emision.getDate() + DIAS_PARA_PAGAR);
  const mes = String(periodo.getMonth() + 1).padStart(2, '0');
  return centros.flatMap((centro) => (centro.tarifa && centro.margen ? [centro] : [])).map((centro, index) => {
    const neto = Math.round(centro.margen?.precioVentaClp ?? 0);
    const iva = Math.round(neto * IVA);
    return {
      id: `${centro.id}-${mes}`,
      numero: `FE-${periodo.getFullYear()}-${mes}${String(index + 1).padStart(2, '0')}`,
      centro: centro.name,
      cliente: centro.tarifa?.cliente ?? '—',
      periodo: formatPeriodo(periodo),
      emision: toIsoDate(emision),
      vencimiento: toIsoDate(vencimiento),
      consumoMwh: centro.consumoMesKwh / 1000,
      precioMwh: (centro.tarifa?.ventaClpKwh ?? 0) * 1000,
      neto,
      iva,
      total: neto + iva,
      estado: hoy > vencimiento ? 'vencida' : 'pendiente',
    };
  });
}

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

function descargarPdf(factura: Factura) {
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
  <div class="meta-item"><div class="meta-label">Cliente</div><div class="meta-value">${factura.cliente}</div></div>
  <div class="meta-item"><div class="meta-label">Periodo</div><div class="meta-value">${factura.periodo}</div></div>
  <div class="meta-item"><div class="meta-label">Emisión</div><div class="meta-value">${factura.emision}</div></div>
  <div class="meta-item"><div class="meta-label">Vencimiento</div><div class="meta-value">${factura.vencimiento}</div></div>
  <div class="meta-item"><div class="meta-label">Estado</div><div class="meta-value">${ESTADO_LABEL[factura.estado]}</div></div>
</div>
<table>
  <thead><tr><th>Concepto</th><th class="right">Cantidad</th><th class="right">Precio unit.</th><th class="right">Subtotal</th></tr></thead>
  <tbody>
    <tr><td>Energía consumida</td><td class="right mono">${fmt(factura.consumoMwh, 1)} MWh</td><td class="right mono">$${fmt(factura.precioMwh)}/MWh</td><td class="right mono">$${fmt(factura.neto)}</td></tr>
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
  const [filtro, setFiltro] = useState<'todas' | EstadoFactura>('todas');
  const fleet = useEmsFleet();
  const facturas = useMemo(() => buildFacturas(fleet.centros, fleet.periodo, new Date()), [fleet.centros, fleet.periodo]);

  const filtered = filtro === 'todas' ? facturas : facturas.filter((f) => f.estado === filtro);
  const totalNeto = filtered.reduce((s, f) => s + f.neto, 0);
  const totalTotal = filtered.reduce((s, f) => s + f.total, 0);
  const pendientes = facturas.filter((f) => f.estado === 'pendiente');
  const vencidas = facturas.filter((f) => f.estado === 'vencida');

  return (
    <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:overflow-hidden md:p-6">
        <div className="flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Facturas</h1>
            <p className="text-xs text-muted">{facturas.length} facturas emitidas</p>
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
    </QueryStateView>
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
