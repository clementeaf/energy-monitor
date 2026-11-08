import { useNavigate } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useAppStore } from '../../store/useAppStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { descargarArchivo } from './exportar';
import { formatMillonesClp, formatNumber, formatPeriodo } from './format';
import { KpiTile } from './KpiTile';
import { PageAction } from './PageAction';
import { canEditSection, EMS_SECTION_PATHS } from './roles';
import { sumarMargenes, type MargenCentro } from './tariffs';
import { useEmsFleet } from './useEmsFleet';
import { useEmsRole } from './useEmsRole';

interface CentroMargen extends MargenCentro {
  id: string;
  name: string;
  cliente: string;
}

type EstadoMargen = 'bajo' | 'observacion' | 'sobre';

const BANDA_OBSERVACION_PTS = 7;
const ESTADO_MARGEN: Record<EstadoMargen, { label: string; cls: string; bar: string }> = {
  bajo: { label: '! Bajo el mínimo', cls: 'text-danger-ink bg-danger-bg', bar: 'bg-danger' },
  observacion: { label: '⚠ En observación', cls: 'text-warning-ink bg-warning-bg', bar: 'bg-warning' },
  sobre: { label: '✓ Sobre el mínimo', cls: 'text-success-ink bg-success-bg', bar: 'bg-primary' },
};

export function estadoMargen(margenPct: number, minimoPct: number): EstadoMargen {
  if (margenPct < minimoPct) return 'bajo';
  if (margenPct < minimoPct + BANDA_OBSERVACION_PTS) return 'observacion';
  return 'sobre';
}

export function MargenesPage() {
  const navigate = useNavigate();
  const minimo = useAppStore((s) => s.margenMinimo);
  const setMinimo = useAppStore((s) => s.setMargenMinimo);
  const canEdit = canEditSection(useEmsRole(), 'margenes');
  const fleet = useEmsFleet();
  const centros: CentroMargen[] = fleet.centros
    .flatMap((c) => (c.margen && c.tarifa ? [{ id: c.id, name: c.name, cliente: c.tarifa.cliente, ...c.margen }] : []))
    .sort((a, b) => a.margenPct - b.margenPct);
  const total = sumarMargenes(centros);
  const periodo = formatPeriodo(fleet.periodo);
  const maxPct = Math.max(minimo + BANDA_OBSERVACION_PTS, ...centros.map((c) => c.margenPct), 1);
  const ordenados = [...centros].sort((a, b) => b.margenPct - a.margenPct);

  const exportar = () => {
    const filas = [['Centro', 'Cliente', 'Venta', 'Compra', 'Margen', '%', 'Estado'], ...centros.map((c) => [c.name, c.cliente, formatNumber(c.precioVentaClp), formatNumber(c.costoCompraClp), formatNumber(c.margenClp), formatNumber(c.margenPct, 1), ESTADO_MARGEN[estadoMargen(c.margenPct, minimo)].label])];
    descargarArchivo(`margenes-${fleet.periodo.toLocaleDateString('sv-SE').slice(0, 7)}.csv`, `﻿${filas.map((fila) => fila.join(';')).join('\n')}`, 'text/csv;charset=utf-8');
  };

  usePageTitle('Márgenes', `Add-ons / Márgenes · ${periodo}`, <PageAction label="↓ Exportar" onClick={exportar} />);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
        <div className="flex flex-col gap-4">
          {canEdit && (
            <label className="flex items-center gap-1.5 self-end text-xs text-muted">
              Mínimo contractual
              <input type="number" min={0} max={60} value={minimo} onChange={(e) => setMinimo(Number(e.target.value))}
                className="w-14 rounded-lg border border-border bg-surface px-2 py-1 text-center font-mono text-xs text-foreground focus:border-accent focus:outline-none" />
              %
            </label>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiTile label="Venta de energía" value={formatMillonesClp(total.precioVentaClp)} unit="CLP" sub={periodo} />
            <KpiTile label="Costo de compra" value={formatMillonesClp(total.costoCompraClp)} unit="CLP" sub={periodo} />
            <KpiTile variant="inverse" label="Margen" value={formatMillonesClp(total.margenClp)} unit="CLP" sub={periodo} />
            <KpiTile label="Margen promedio" value={formatNumber(total.margenPct, 1)} unit="%" sub={`Mínimo ${formatNumber(minimo)} %`} tone={total.margenPct < minimo ? 'negative' : 'neutral'} />
          </div>

          <section className="rounded-xl bg-card p-5">
            <h2 className="text-sm font-semibold text-card-fg first-letter:uppercase">Margen por centro · {periodo}</h2>
            <p className="mb-4 text-xs text-card-muted">% sobre la venta · línea punteada: mínimo contractual {formatNumber(minimo)} %</p>
            {centros.length === 0 ? <p className="py-8 text-center text-xs text-muted">Ningún centro tiene tarifa de compra y venta configurada.</p> : (
              <div className="flex flex-col gap-1.5">
                <div className="relative mt-5 flex h-52 items-end gap-3">
                  <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-danger" style={{ bottom: `${(minimo / maxPct) * 100}%` }} />
                  {ordenados.map((c) => (
                    <button key={c.id} type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.centros}/${c.id}`)} title={`${c.name} · ${formatNumber(c.margenPct, 1)} %`}
                      className="relative mx-auto w-full max-w-24 flex-1 rounded-t-md" style={{ height: `${Math.max(2, (c.margenPct / maxPct) * 100)}%` }}>
                      <span className={`absolute inset-0 rounded-t-md ${ESTADO_MARGEN[estadoMargen(c.margenPct, minimo)].bar}`} />
                      <span className="absolute -top-5 inset-x-0 text-center font-mono text-[11px] text-foreground">{formatNumber(c.margenPct, 1)} %</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  {ordenados.map((c) => <span key={c.id} className="mx-auto w-full max-w-24 flex-1 truncate text-center text-[10px] text-muted">{c.name}</span>)}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl bg-card">
            <h2 className="px-5 py-4 text-sm font-semibold text-card-fg">Detalle por centro</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-raised">
                    {['Centro · cliente', 'Venta', 'Compra', 'Margen', '%', 'Estado'].map((label) => (
                      <th key={label} className={`px-5 py-2.5 text-[11px] font-normal text-muted ${['Venta', 'Compra', 'Margen', '%'].includes(label) ? 'text-right' : 'text-left'}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {centros.map((c) => {
                    const estado = ESTADO_MARGEN[estadoMargen(c.margenPct, minimo)];
                    return (
                      <tr key={c.id} onClick={() => navigate(`${EMS_SECTION_PATHS.centros}/${c.id}`)} className="cursor-pointer hover:bg-raised">
                        <td className="px-5 py-3 text-sm text-foreground">{c.name} · <span className="text-muted">{c.cliente}</span></td>
                        <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">$ {formatNumber(c.precioVentaClp)}</td>
                        <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">$ {formatNumber(c.costoCompraClp)}</td>
                        <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">$ {formatNumber(c.margenClp)}</td>
                        <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">{formatNumber(c.margenPct, 1)} %</td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.cls}`}>{estado.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </QueryStateView>
    </div>
  );
}
