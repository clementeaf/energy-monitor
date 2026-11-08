import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useAppStore } from '../../store/useAppStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { dailyBars, DemandBars } from './DemandBars';
import { descargarArchivo } from './exportar';
import { EstadoDocumentoBadge } from './FacturacionPage';
import type { Centro, LoadPoint, Remarcador } from './fleet';
import { formatMillonesClp, formatNumber, formatPeriodo } from './format';
import { KpiTile } from './KpiTile';
import { PageAction } from './PageAction';
import { canViewSection, EMS_SECTION_PATHS } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { StatusBadge } from './StatusBadge';
import { useNotasCobro } from './useFacturacion';
import { useEmsFleet, useLoadCurves } from './useEmsFleet';
import { useEmsRole } from './useEmsRole';

type Metrica = 'demanda' | 'consumo' | 'costo';

const HOURS_PER_DAY = 24;
const DOCUMENTOS_RECIENTES = 3;
const SECONDARY_BUTTON = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised';

export function serieDiaria(points: LoadPoint[], metrica: Metrica, compraClpKwh: number | null): LoadPoint[] {
  const factor: Record<Metrica, number> = { demanda: 1, consumo: HOURS_PER_DAY, costo: HOURS_PER_DAY * (compraClpKwh ?? 0) };
  return points.map((point) => ({ ...point, kw: point.kw * factor[metrica] }));
}

const METRICAS: Record<Metrica, { label: string; unit: string }> = {
  demanda: { label: 'Demanda promedio', unit: 'kW' },
  consumo: { label: 'Consumo', unit: 'kWh' },
  costo: { label: 'Costo de compra', unit: 'CLP' },
};

export function CentroDetailPage() {
  const { centroId = '' } = useParams<{ centroId: string }>();
  const fleet = useEmsFleet();
  const centro = fleet.centros.find((c) => c.id === centroId);
  const meters = fleet.remarcadores.filter((r) => r.centroId === centroId);

  const exportar = () => {
    const filas = [['Remarcador', 'Nombre', 'Estado', 'kWh del mes'], ...meters.map((m) => [m.code, m.name, m.estado, formatNumber(fleet.consumoPorRemarcador[m.id] ?? 0)])];
    descargarArchivo(`${centro?.code ?? 'centro'}.csv`, `﻿${filas.map((fila) => fila.join(';')).join('\n')}`, 'text/csv;charset=utf-8');
  };
  usePageTitle(centro?.name ?? 'Centro', `Núcleo / Centros / ${centro?.name ?? ''}`, centro ? <PageAction label="↓ Exportar reporte" onClick={exportar} /> : undefined);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
        {centro
          ? <CentroDetalle centro={centro} meters={meters} consumoPorRemarcador={fleet.consumoPorRemarcador} periodo={fleet.periodo} />
          : <div className="flex h-full items-center justify-center text-sm text-muted">Centro no encontrado.</div>}
      </QueryStateView>
    </div>
  );
}

function CentroDetalle({ centro, meters, consumoPorRemarcador, periodo }: Readonly<{ centro: Centro; meters: Remarcador[]; consumoPorRemarcador: Record<string, number>; periodo: Date }>) {
  const navigate = useNavigate();
  const role = useEmsRole();
  const margenMinimo = useAppStore((s) => s.margenMinimo);
  const [metrica, setMetrica] = useState<Metrica>('demanda');
  const { phase, curves } = useLoadCurves('30dias');
  const points = curves.get(centro.id) ?? [];
  const demandaMaxima = phase === 'ready' ? Math.max(0, ...points.map((p) => p.kw)) : null;
  const sinLecturas = meters.filter((m) => m.estado !== 'conectado');
  const isBajoMinimo = centro.margen !== null && centro.margen.margenPct < margenMinimo;
  const puedeVerMargenes = canViewSection(role, 'margenes');
  const puedeVerFacturacion = canViewSection(role, 'facturacion');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge estado={centro.estado} />
        {centro.tarifa && <Tag>{centro.tarifa.cliente}</Tag>}
        {centro.tarifa && <Tag>Venta $ {formatNumber(centro.tarifa.ventaClpKwh)} / kWh</Tag>}
        {centro.address && <span className="text-xs text-muted">{centro.address}</span>}
        <div className="ml-auto flex gap-2">
          {puedeVerMargenes && <button type="button" onClick={() => navigate(EMS_SECTION_PATHS.margenes)} className={SECONDARY_BUTTON}>Márgenes</button>}
          {puedeVerFacturacion && <button type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.facturacion}?centro=${centro.id}`)} className={SECONDARY_BUTTON}>Documentos</button>}
        </div>
      </div>

      {sinLecturas.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-warning-bg px-4 py-3 text-warning-ink">
          <div className="flex-1">
            <p className="text-sm font-medium">⚠ {sinLecturas.length} remarcador{sinLecturas.length === 1 ? '' : 'es'} sin lecturas recientes</p>
            <p className="text-xs">Sin lecturas no hay consumo, margen ni facturación confiables para este centro.</p>
          </div>
          <button type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.remarcadores}?centro=${centro.id}`)} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-foreground">Ver remarcadores</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile variant="inverse" label={`Consumo de ${formatPeriodo(periodo)}`} value={formatNumber(centro.consumoMesKwh / 1000, 1)} unit="MWh" />
        <KpiTile label="Demanda promedio máx. diaria" value={formatNumber(demandaMaxima, 1)} unit="kW" sub="Últimos 30 días" />
        <KpiTile label="Margen del centro" value={centro.margen ? formatNumber(centro.margen.margenPct, 1) : '—'} unit={centro.margen ? '%' : undefined}
          sub={centro.margen ? `Mínimo ${formatNumber(margenMinimo)} %` : 'Sin tarifa'} tone={isBajoMinimo ? 'negative' : 'neutral'} />
        <KpiTile label="Gasto energético" value={formatMillonesClp(centro.margen?.costoCompraClp ?? null)} unit="CLP" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <section className="rounded-xl bg-card p-5">
            <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-card-fg">{METRICAS[metrica].label} diario · 30 días</h2>
                <p className="text-xs text-card-muted">{metrica === 'demanda' ? 'kW promedio por día' : metrica === 'consumo' ? 'Estimado como demanda promedio × 24 h' : 'Consumo estimado × tarifa de compra'}</p>
              </div>
              <div role="tablist" aria-label="Métrica" className={SEGMENT_TRACK_CLASS}>
                {(Object.keys(METRICAS) as Metrica[]).filter((key) => key !== 'costo' || centro.tarifa).map((key) => (
                  <button key={key} type="button" role="tab" aria-selected={metrica === key} onClick={() => setMetrica(key)} className={segmentClass(metrica === key)}>{key === 'demanda' ? 'Demanda' : key === 'consumo' ? 'Consumo' : 'Costo'}</button>
                ))}
              </div>
            </header>
            <QueryStateView phase={phase} error={null} variant="widget">
              {points.length === 0
                ? <p className="py-12 text-center text-xs text-muted">Sin datos en los últimos 30 días</p>
                : <DemandBars bars={dailyBars(serieDiaria(points, metrica, centro.tarifa?.compraClpKwh ?? null))} unit={METRICAS[metrica].unit} label={METRICAS[metrica].label} />}
            </QueryStateView>
          </section>

          <section className="rounded-xl bg-card p-5">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-card-fg">Remarcadores del centro · {meters.length}</h2>
              <button type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.remarcadores}?centro=${centro.id}`)} className="text-xs font-medium text-foreground hover:underline">Ver en Remarcadores →</button>
            </header>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {meters.map((m) => (
                <button key={m.id} type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.remarcadores}/${m.id}`)} className="rounded-lg bg-raised p-3 text-left hover:bg-background">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs font-semibold text-foreground">{m.code}</span>
                    <StatusBadge estado={m.estado} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{m.name}</p>
                  <p className="mt-1 font-mono text-sm text-foreground">{formatNumber(consumoPorRemarcador[m.id] ?? 0)} <span className="text-[10px] text-muted">kWh en el mes</span></p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {puedeVerMargenes && <MargenCard centro={centro} margenMinimo={margenMinimo} periodo={periodo} />}
          {puedeVerFacturacion && <DocumentosRecientes centroId={centro.id} />}
        </div>
      </div>
    </div>
  );
}

function MargenCard({ centro, margenMinimo, periodo }: Readonly<{ centro: Centro; margenMinimo: number; periodo: Date }>) {
  if (!centro.margen) {
    return (
      <section className="rounded-xl bg-card p-5">
        <h2 className="text-sm font-semibold text-card-fg">Margen del centro</h2>
        <p className="mt-2 text-xs text-muted">Sin tarifa de compra y venta configurada para este centro.</p>
      </section>
    );
  }
  const { precioVentaClp, costoCompraClp, margenClp, margenPct } = centro.margen;
  const isBajo = margenPct < margenMinimo;
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-5">
      <h2 className="text-sm font-semibold text-card-fg first-letter:uppercase">Margen del centro · {formatPeriodo(periodo)}</h2>
      {[{ label: 'Precio de venta', value: precioVentaClp, tone: 'bg-primary' }, { label: 'Costo de compra', value: costoCompraClp, tone: 'bg-border-strong' }].map((fila) => (
        <div key={fila.label}>
          <p className="flex justify-between text-xs"><span className="text-muted">{fila.label}</span><span className="font-mono text-foreground">$ {formatNumber(fila.value)}</span></p>
          <div className="mt-1 h-2 rounded-full bg-raised"><div className={`h-2 rounded-full ${fila.tone}`} style={{ width: `${precioVentaClp > 0 ? (fila.value / precioVentaClp) * 100 : 0}%` }} /></div>
        </div>
      ))}
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${isBajo ? 'bg-danger-bg text-danger-ink' : 'bg-warning-bg text-warning-ink'}`}>
        <div>
          <p className="text-[10px]">Margen</p>
          <p className="font-mono text-sm font-semibold">$ {formatNumber(margenClp)} · {formatNumber(margenPct, 1)} %</p>
        </div>
        <span className="text-xs">Mín. {formatNumber(margenMinimo)} %</span>
      </div>
    </section>
  );
}

function DocumentosRecientes({ centroId }: Readonly<{ centroId: string }>) {
  const navigate = useNavigate();
  const { notas } = useNotasCobro();
  const propias = notas.filter((nota) => nota.centroId === centroId).slice(0, DOCUMENTOS_RECIENTES);
  return (
    <section className="rounded-xl bg-card p-5">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-card-fg">Documentos recientes</h2>
        <span className="rounded-md bg-module-facturacion-bg px-1.5 py-0.5 text-[10px] font-semibold text-module-facturacion-ink">Facturación</span>
      </header>
      {propias.length === 0 ? <p className="text-xs text-muted">Sin notas de cobro: el centro no tiene tarifa de venta.</p> : (
        <ul className="divide-y divide-card-border">
          {propias.map((nota) => (
            <li key={nota.id}>
              <button type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.facturacion}/${nota.id}`)} className="flex w-full items-center justify-between gap-2 py-2.5 text-left hover:bg-raised">
                <div>
                  <p className="font-mono text-sm text-foreground">{nota.folio}</p>
                  <p className="text-[11px] text-muted"><span className="inline-block first-letter:uppercase">{nota.periodo}</span> · $ {formatNumber(nota.total)}</p>
                </div>
                <EstadoDocumentoBadge estado={nota.estado} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Tag({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-foreground">{children}</span>;
}
