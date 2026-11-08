import { useState } from 'react';
import { useNavigate } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { usePageTitle } from '../../store/usePageTitleStore';
import { descargarArchivo } from './exportar';
import { PORTFOLIO_CURVE, type Centro, type LoadPoint } from './fleet';
import { formatNumber } from './format';
import { KpiTile, Variacion } from './KpiTile';
import { PageAction } from './PageAction';
import { desplazarMeses, etiquetaTramo, nombreMes, variacionPct } from './periodos';
import { EMS_SECTION_PATHS } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { useEmsFleet, useLoadCurves, type LoadRange } from './useEmsFleet';

const RANGOS: Record<LoadRange, { label: string; horasPorPunto: number }> = {
  hoy: { label: 'Hoy', horasPorPunto: 1 },
  '7dias': { label: '7 días', horasPorPunto: 24 },
  '30dias': { label: '30 días', horasPorPunto: 24 },
};
const PUNTA = { desde: 18, hasta: 22 };
const HORAS = 24;
const PICOS = 3;
const FIELD_CLASS = 'h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:border-accent focus:outline-none';

export function esPunta(hora: number): boolean {
  return hora >= PUNTA.desde && hora < PUNTA.hasta;
}

export function perfilHorario(points: LoadPoint[]): (number | null)[] {
  const porHora = Array.from({ length: HORAS }, () => [] as number[]);
  for (const point of points) porHora[new Date(point.timestamp).getHours()].push(point.kw);
  return porHora.map((valores) => (valores.length > 0 ? valores.reduce((sum, kw) => sum + kw, 0) / valores.length : null));
}

export function participacionPunta(perfil: (number | null)[]): number {
  const total = perfil.reduce<number>((sum, kw) => sum + (kw ?? 0), 0);
  const punta = perfil.reduce<number>((sum, kw, hora) => sum + (esPunta(hora) ? kw ?? 0 : 0), 0);
  return total > 0 ? (punta / total) * 100 : 0;
}

type Comparacion = 'mes' | 'anio';

const MESES_ATRAS: Record<Comparacion, number> = { mes: 1, anio: 12 };
const DESFASE: Record<Comparacion, string> = { mes: 'un mes', anio: 'un año' };

interface MetricasConsumo {
  energiaMwh: number;
  peak: number;
  factorCarga: number;
  puntaPct: number;
}

export function metricasConsumo(points: LoadPoint[], perfil: (number | null)[], horasPorPunto: number): MetricasConsumo {
  const peak = Math.max(0, ...points.map((p) => p.kw));
  const total = points.reduce((sum, p) => sum + p.kw, 0);
  const promedio = points.length > 0 ? total / points.length : 0;
  return { energiaMwh: (total * horasPorPunto) / 1000, peak, factorCarga: peak > 0 ? promedio / peak : 0, puntaPct: participacionPunta(perfil) };
}

function etiquetaComparacion(comparacion: Comparacion, hasta: Date): string {
  const mes = nombreMes(hasta);
  return comparacion === 'anio' ? `${mes} ${hasta.getFullYear()}` : mes;
}

export function ConsumoPage() {
  const navigate = useNavigate();
  const [rango, setRango] = useState<LoadRange>('30dias');
  const [centroId, setCentroId] = useState('');
  const [comparacion, setComparacion] = useState<Comparacion>('mes');
  const fleet = useEmsFleet();
  const periodo = useLoadCurves(rango);
  const hoy = useLoadCurves('hoy');
  const periodoPrevio = useLoadCurves(rango, MESES_ATRAS[comparacion]);
  const hoyPrevio = useLoadCurves('hoy', MESES_ATRAS[comparacion]);
  const curva = centroId || PORTFOLIO_CURVE;
  const points = periodo.curves.get(curva) ?? [];
  const pointsPrevios = periodoPrevio.curves.get(curva) ?? [];
  const perfil = perfilHorario(hoy.curves.get(curva) ?? []);
  const perfilPrevio = perfilHorario(hoyPrevio.curves.get(curva) ?? []);
  const actual = metricasConsumo(points, perfil, RANGOS[rango].horasPorPunto);
  const previo = metricasConsumo(pointsPrevios, perfilPrevio, RANGOS[rango].horasPorPunto);
  const isPrevioCargando = periodoPrevio.phase === 'loading' || hoyPrevio.phase === 'loading';
  const hayPrevio = pointsPrevios.length > 0;
  const hayPerfilPrevio = perfilPrevio.some((kw) => kw !== null);
  const vs = etiquetaComparacion(comparacion, periodoPrevio.rango.hasta);
  const tramo = etiquetaTramo(periodoPrevio.rango);
  const variacion = (valor: number, anterior: number) => (isPrevioCargando ? undefined : hayPrevio ? variacionPct(valor, anterior) : null);
  const diaPrevio = hoyPrevio.rango.desde.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: comparacion === 'anio' ? 'numeric' : undefined }).replace('.', '');

  const exportar = () => {
    const filas = [['Fecha', 'kW promedio'], ...points.map((p) => [p.timestamp, formatNumber(p.kw, 1)])];
    descargarArchivo(`consumo-${rango}.csv`, `﻿${filas.map((fila) => fila.join(';')).join('\n')}`, 'text/csv;charset=utf-8');
  };
  usePageTitle('Analítica de Consumo', 'Add-ons / Analítica de Consumo', <PageAction label="↓ Exportar" onClick={exportar} />);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Período" className={SEGMENT_TRACK_CLASS}>
            {(Object.keys(RANGOS) as LoadRange[]).map((key) => (
              <button key={key} type="button" role="tab" aria-selected={rango === key} onClick={() => setRango(key)} className={segmentClass(rango === key)}>{RANGOS[key].label}</button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <select value={centroId} onChange={(event) => setCentroId(event.target.value)} aria-label="Centro" className={FIELD_CLASS}>
              <option value="">Todos los centros</option>
              {fleet.centros.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={comparacion} onChange={(event) => setComparacion(event.target.value as Comparacion)} aria-label="Comparar con" className={FIELD_CLASS}>
              {(Object.keys(MESES_ATRAS) as Comparacion[]).map((key) => (
                <option key={key} value={key}>Comparar con: {etiquetaComparacion(key, desplazarMeses(new Date(), -MESES_ATRAS[key]))}</option>
              ))}
            </select>
          </div>
        </div>

        <QueryStateView phase={periodo.phase} error={null}>
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiTile variant="inverse" label="Consumo del período" value={formatNumber(actual.energiaMwh, 1)} unit="MWh"
                sub={<Variacion valor={variacion(actual.energiaMwh, previo.energiaMwh)} vs={vs} tramo={tramo} isMejorSiBaja />} />
              <KpiTile label="Demanda máxima agregada" value={formatNumber(actual.peak, 1)} unit="kW"
                sub={<Variacion valor={variacion(actual.peak, previo.peak)} vs={vs} tramo={tramo} isMejorSiBaja />} />
              <KpiTile label="Consumo en horario punta" value={formatNumber(actual.puntaPct, 1)} unit="%"
                sub={<Variacion valor={isPrevioCargando ? undefined : hayPerfilPrevio ? actual.puntaPct - previo.puntaPct : null} unidad="pts" vs={diaPrevio} isMejorSiBaja />} />
              <KpiTile label="Factor de carga" value={formatNumber(actual.factorCarga, 2)} sub="Promedio / máximo" />
            </div>
            <p className="text-[11px] text-muted">* {RANGOS[rango].label} hasta ahora contra el mismo tramo {DESFASE[comparacion]} antes ({tramo}). Horario punta: hoy contra {diaPrevio}. Consumo estimado desde la demanda promedio.</p>
          </div>
        </QueryStateView>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="min-w-0 rounded-xl bg-card p-5 xl:col-span-2">
            <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-card-fg">Perfil horario · hoy</h2>
                <p className="text-xs text-card-muted">kW promedio por hora · {centroId ? fleet.centros.find((c) => c.id === centroId)?.name : 'todos los centros'}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" />Hoy</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-border-strong" />{diaPrevio}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-warning-bg ring-1 ring-warning" />Horario punta {PUNTA.desde}–{PUNTA.hasta} h</span>
              </div>
            </header>
            <QueryStateView phase={hoy.phase} error={null} variant="widget">
              <PerfilHorario perfil={perfil} perfilPrevio={hayPerfilPrevio ? perfilPrevio : null} etiquetaPrevia={diaPrevio} />
            </QueryStateView>
          </section>

          <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch} variant="widget">
            <IntensidadRanking centros={fleet.centros} onOpen={(id) => navigate(`${EMS_SECTION_PATHS.centros}/${id}`)} />
          </QueryStateView>
        </div>

        <PicosDemanda curves={periodo.curves} centros={fleet.centros} isLoading={periodo.phase === 'loading'} rango={RANGOS[rango].label} />
      </div>
    </div>
  );
}

function PerfilHorario({ perfil, perfilPrevio, etiquetaPrevia }: Readonly<{ perfil: (number | null)[]; perfilPrevio: (number | null)[] | null; etiquetaPrevia: string }>) {
  const max = Math.max(1, ...perfil.map((kw) => kw ?? 0), ...(perfilPrevio ?? []).map((kw) => kw ?? 0));
  const altura = (kw: number | null) => `${kw === null ? 4 : Math.max(3, (kw / max) * 100)}%`;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-52 items-end gap-1">
        <div className="pointer-events-none absolute inset-y-0 flex justify-center rounded-md bg-warning-bg" style={{ left: `${(PUNTA.desde / HORAS) * 100}%`, width: `${((PUNTA.hasta - PUNTA.desde) / HORAS) * 100}%` }}>
          <span className="-mt-2 h-fit rounded-full bg-warning px-2 text-[10px] font-medium text-accent-ink">Punta</span>
        </div>
        {perfil.map((kw, hora) => {
          const kwPrevio = perfilPrevio?.[hora] ?? null;
          const detalle = `${hora}:00 · hoy ${kw === null ? 'sin dato' : `${formatNumber(kw, 1)} kW`}${perfilPrevio ? ` · ${etiquetaPrevia} ${kwPrevio === null ? 'sin dato' : `${formatNumber(kwPrevio, 1)} kW`}` : ''}`;
          return (
            <div key={hora} title={detalle} className="relative flex h-full flex-1 items-end gap-px">
              <div className={`flex-1 rounded-t-sm ${kw === null ? 'bg-border' : 'bg-primary'}`} style={{ height: altura(kw) }} />
              {perfilPrevio && <div className={`flex-1 rounded-t-sm ${kwPrevio === null ? 'bg-border' : 'bg-border-strong'}`} style={{ height: altura(kwPrevio) }} />}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted">
        {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((hora) => <span key={hora}>{String(hora).padStart(2, '0')}</span>)}
      </div>
    </div>
  );
}

const RANKINGS = {
  intensidad: { titulo: 'Intensidad por centro', sub: 'kWh por m² en el mes · de mayor a menor', valor: (c: Centro) => c.intensidadKwhM2 },
  consumo: { titulo: 'Consumo por centro', sub: 'MWh en el mes · de mayor a menor · sin superficie registrada', valor: (c: Centro) => c.consumoMesKwh / 1000 },
};

function IntensidadRanking({ centros, onOpen }: Readonly<{ centros: Centro[]; onOpen: (id: string) => void }>) {
  const metrica = RANKINGS[centros.some((c) => c.intensidadKwhM2 !== null) ? 'intensidad' : 'consumo'];
  const ranking = centros.flatMap((c) => {
    const valor = metrica.valor(c);
    return valor === null ? [] : [{ id: c.id, name: c.name, valor }];
  }).sort((a, b) => b.valor - a.valor);
  const max = Math.max(1, ...ranking.map((r) => r.valor));
  const tono = (i: number) => (i === 0 ? 'bg-danger' : i === 1 ? 'bg-warning' : i === ranking.length - 1 ? 'bg-success' : 'bg-border-strong');
  return (
    <section className="rounded-xl bg-card p-5">
      <h2 className="text-sm font-semibold text-card-fg">{metrica.titulo}</h2>
      <p className="mb-3 text-xs text-card-muted">{metrica.sub}</p>
      {ranking.length === 0 ? <p className="text-xs text-muted">Sin consumo registrado en el mes.</p> : (
        <ul className="flex flex-col gap-3">
          {ranking.map((r, i) => (
            <li key={r.id}>
              <button type="button" onClick={() => onOpen(r.id)} className="w-full text-left">
                <p className="flex justify-between text-xs"><span className="text-foreground">{r.name}</span><span className="font-mono text-foreground">{formatNumber(r.valor, 1)}</span></p>
                <div className="mt-1 h-1.5 rounded-full bg-raised"><div className={`h-1.5 rounded-full ${tono(i)}`} style={{ width: `${(r.valor / max) * 100}%` }} /></div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {ranking.length < centros.length && <p className="mt-3 text-[11px] text-muted">{centros.length - ranking.length} centro(s) sin superficie registrada.</p>}
    </section>
  );
}

function PicosDemanda({ curves, centros, isLoading, rango }: Readonly<{ curves: Map<string, LoadPoint[]>; centros: Centro[]; isLoading: boolean; rango: string }>) {
  const navigate = useNavigate();
  const picos = centros
    .flatMap((c) => {
      const pico = (curves.get(c.id) ?? []).reduce<LoadPoint | null>((best, p) => (p.kw > (best?.kw ?? 0) ? p : best), null);
      return pico ? [{ centro: c, pico }] : [];
    })
    .sort((a, b) => b.pico.kw - a.pico.kw)
    .slice(0, PICOS);
  return (
    <section className="rounded-xl bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold text-card-fg">Picos de demanda · {rango}</h2>
      {isLoading ? (
        <div className="grid animate-pulse gap-3 md:grid-cols-3" role="status" aria-label="Cargando">
          {Array.from({ length: PICOS }, (_, i) => <div key={i} className="h-24 rounded-lg bg-raised" />)}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {picos.map(({ centro, pico }) => (
            <button key={centro.id} type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.centros}/${centro.id}`)} className="rounded-lg bg-raised p-3 text-left hover:bg-background">
              <p className="text-sm text-foreground">{centro.name}</p>
              <p className="font-mono text-[11px] text-muted">{new Date(pico.timestamp).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              <p className="mt-1 font-mono text-xl font-semibold text-foreground">{formatNumber(pico.kw, 1)} <span className="text-xs font-normal text-muted">kW</span></p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
