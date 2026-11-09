import { useState } from 'react';
import { useNavigate } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { dailyBars, DemandBars, hourlyBars } from './DemandBars';
import { formatDateTime, formatMillonesClp, formatNumber, formatPeriodo, formatSenal } from './format';
import { medidoresDeConsumo, PORTFOLIO_CURVE, requiereAtencion, type Centro, type Remarcador, type RemarcadorEstado } from './fleet';
import { KpiTile, NotaComparacion, Variacion } from './KpiTile';
import { PageAction } from './PageAction';
import { comparablesEntre, etiquetaComparacion, etiquetaTramo, isTramoParcial, periodoAnterior, periodoQueContiene, tramoEquivalente, variacionPct } from './periodos';
import { canEditSection, EMS_SECTION_PATHS } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { StatusBadge } from './StatusBadge';
import { sumarMargenes } from './tariffs';
import { onRowKeyDown, SearchInput } from './table';
import { useCentrosEnRango, useEmsFleet, useLoadCurves, type EmsFleet, type LoadRange } from './useEmsFleet';
import { useEmsRole } from './useEmsRole';

const RANGOS: Record<LoadRange, string> = { hoy: 'Hoy', '7dias': '7 días', '30dias': '30 días' };
const SEVERIDAD: RemarcadorEstado[] = ['caido', 'sin_senal', 'mantencion'];
const ESTADO_POR_SENAL: Record<RemarcadorEstado, 'operativo' | 'advertencia' | 'alarma' | 'mantencion'> = {
  conectado: 'operativo', sin_senal: 'advertencia', caido: 'alarma', mantencion: 'mantencion',
};
const PAGINA = 5;
const MINUTE_MS = 60_000;

export function saludo(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function remarcadoresConIncidencia(remarcadores: Remarcador[]): Remarcador[] {
  return remarcadores
    .filter((remarcador) => remarcador.estado !== 'conectado')
    .sort((a, b) => SEVERIDAD.indexOf(a.estado) - SEVERIDAD.indexOf(b.estado));
}

export function ResumenPage() {
  const navigate = useNavigate();
  const role = useEmsRole();
  const fleet = useEmsFleet();
  const nombre = useAuthStore((s) => s.user?.displayName?.split(' ')[0] ?? '');
  const margenMinimo = useAppStore((s) => s.margenMinimo);
  const isMargenActivo = useAppStore((s) => s.modulosActivos.margenes);
  const { centros, remarcadores } = fleet;
  const enAtencion = centros.filter((centro) => requiereAtencion(centro, margenMinimo));
  const canReport = canEditSection(role, 'reportes');

  usePageTitle(
    `${saludo(new Date())}${nombre ? `, ${nombre}` : ''}`,
    `${centros.length} centros · ${remarcadores.length} remarcadores · ${formatPeriodo(fleet.periodo)}`,
    <>
      {enAtencion.length > 0 && (
        <button type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.centros}?filtro=atencion`)} className="hidden h-7 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-medium text-accent-ink hover:bg-accent-hover lg:flex">
          ⚠ {enAtencion.length} centro{enAtencion.length === 1 ? '' : 's'} requiere{enAtencion.length === 1 ? '' : 'n'} atención
        </button>
      )}
      {canReport && <PageAction label="+ Nuevo reporte" onClick={() => navigate(EMS_SECTION_PATHS.reportes)} />}
    </>,
  );

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <ResumenPeriodo fleet={fleet} isMargenActivo={isMargenActivo} />
            <div className="flex flex-col gap-4">
              <InsightCard centros={enAtencion} margenMinimo={margenMinimo} isMargenActivo={isMargenActivo} />
              <FlotaCard remarcadores={remarcadores} />
            </div>
          </div>
          <IncidenciasTable remarcadores={remarcadoresConIncidencia(remarcadores)} />
        </div>
      </QueryStateView>
    </div>
  );
}

function ResumenPeriodo({ fleet, isMargenActivo }: Readonly<{ fleet: EmsFleet; isMargenActivo: boolean }>) {
  const navigate = useNavigate();
  const { centros, remarcadores, periodo } = fleet;
  const [rango, setRango] = useState<LoadRange>('hoy');
  const [ahora] = useState(() => new Date());
  const { phase, curves } = useLoadCurves(rango);
  const points = curves.get(PORTFOLIO_CURVE) ?? [];
  const margenesDe = (lista: Centro[]) => sumarMargenes(lista.flatMap((centro) => (centro.margen ? [centro.margen] : [])));
  const margen = margenesDe(centros);
  const mesActual = periodoQueContiene('mes', periodo);
  const mesAnterior = periodoAnterior(mesActual);
  const tramo = tramoEquivalente(mesAnterior, mesActual, ahora);
  const previo = useCentrosEnRango(tramo, fleet);
  const comparables = comparablesEntre(centros, previo.centros, (c) => c.consumoMesKwh);
  const margenComparable = margenesDe(comparables.actuales);
  const margenPrevio = margenesDe(comparables.previos);
  const hayPrevio = previo.phase === 'ready' && comparables.previos.length > 0;
  const consumoDe = (lista: Centro[]) => lista.reduce((sum, c) => sum + c.consumoMesKwh, 0);
  const consumoActual = consumoDe(centros);
  const comparacion = {
    vs: etiquetaComparacion(mesAnterior),
    tramo: isTramoParcial(tramo, mesAnterior) ? etiquetaTramo(tramo) : undefined,
  };
  const isPrevioCargando = previo.phase === 'loading';
  const variacion = (actual: number, anterior: number) => (isPrevioCargando ? undefined : hayPrevio ? variacionPct(actual, anterior) : null);
  const demandaActual = medidoresDeConsumo(remarcadores).filter((r) => r.estado === 'conectado').reduce((sum, r) => sum + (r.potenciaKw ?? 0), 0);
  const ultimaLectura = Math.max(0, ...remarcadores.map((r) => (r.ultimaLectura ? new Date(r.ultimaLectura).getTime() : 0)));
  const haceMin = ultimaLectura > 0 ? Math.round((Date.now() - ultimaLectura) / MINUTE_MS) : null;

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-5 xl:col-span-2">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-card-fg first-letter:uppercase">Resumen de {formatPeriodo(periodo)}</h2>
          <p className="text-xs text-card-muted">{centros.length} centros · {remarcadores.length} remarcadores{haceMin !== null && ` · actualizado hace ${formatNumber(haceMin)} min`}</p>
        </div>
        <div role="tablist" aria-label="Período" className={SEGMENT_TRACK_CLASS}>
          {(Object.keys(RANGOS) as LoadRange[]).map((key) => (
            <button key={key} type="button" role="tab" aria-selected={rango === key} onClick={() => setRango(key)} className={segmentClass(rango === key)}>{RANGOS[key]}</button>
          ))}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile variant="inverse" label="Consumo del mes" value={formatNumber(consumoActual / 1000, 1)} unit="MWh" sub={<Variacion valor={variacion(consumoDe(comparables.actuales), consumoDe(comparables.previos))} isMejorSiBaja {...comparacion} />} onClick={() => navigate(EMS_SECTION_PATHS.consumo)} />
        <KpiTile variant="subtle" label="Demanda actual" value={formatNumber(demandaActual, 1)} unit="kW" sub="Remarcadores conectados" onClick={() => navigate(EMS_SECTION_PATHS.consumo)} />
        <KpiTile variant="subtle" label="Gasto energético" value={formatMillonesClp(margen.costoCompraClp)} unit="CLP" sub={<Variacion valor={variacion(margenComparable.costoCompraClp, margenPrevio.costoCompraClp)} isMejorSiBaja {...comparacion} />} onClick={() => navigate(EMS_SECTION_PATHS.facturacion)} />
        {isMargenActivo
          ? <KpiTile variant="subtle" label="Margen promedio" value={formatNumber(margen.margenPct, 1)} unit="%" sub={<Variacion valor={isPrevioCargando ? undefined : hayPrevio && margenPrevio.precioVentaClp > 0 ? margenComparable.margenPct - margenPrevio.margenPct : null} unidad="pts" {...comparacion} />} onClick={() => navigate(EMS_SECTION_PATHS.margenes)} />
          : <KpiTile variant="subtle" label="Margen promedio 🔒" value="—" sub="Módulo no contratado" onClick={() => navigate(EMS_SECTION_PATHS.margenes)} />}
      </div>
      <NotaComparacion tramo={comparacion.tramo} vs={comparacion.vs} excluidos={isPrevioCargando ? [] : comparables.excluidos} />
      <div className="rounded-xl bg-raised p-4">
        <p className="mb-2 text-xs font-medium text-foreground">Curva de carga · {RANGOS[rango].toLowerCase()}</p>
        <QueryStateView phase={phase} error={null} variant="widget">
          {points.length === 0
            ? <p className="py-12 text-center text-xs text-muted">Sin datos para este período</p>
            : <DemandBars bars={rango === 'hoy' ? hourlyBars(points, new Date()) : dailyBars(points)} />}
        </QueryStateView>
      </div>
    </section>
  );
}

function InsightCard({ centros, margenMinimo, isMargenActivo }: Readonly<{ centros: Centro[]; margenMinimo: number; isMargenActivo: boolean }>) {
  const navigate = useNavigate();
  const bajoMargen = isMargenActivo ? centros.filter((c) => c.margen !== null && c.margen.margenPct < margenMinimo) : [];
  const conIncidencia = centros.filter((c) => c.estado !== 'operativo');
  const items = [
    ...bajoMargen.map((c) => ({ id: `m-${c.id}`, tone: 'bg-danger', texto: `${c.name} cerró en ${formatNumber(c.margen?.margenPct ?? 0, 1)} %` })),
    ...conIncidencia.map((c) => ({ id: `e-${c.id}`, tone: c.estado === 'alarma' ? 'bg-danger' : 'bg-warning', texto: `${c.name} con remarcadores sin lecturas` })),
  ].slice(0, 3);
  const titulo = bajoMargen.length > 0
    ? `${bajoMargen.length} centro${bajoMargen.length === 1 ? '' : 's'} bajo el margen mínimo`
    : centros.length > 0 ? `${centros.length} centro${centros.length === 1 ? '' : 's'} requiere${centros.length === 1 ? '' : 'n'} atención` : 'Todos los centros operan con normalidad';

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-primary p-5 text-primary-fg">
      <p className="text-xs opacity-70">⚡ Insight del día</p>
      <h2 className="text-base font-semibold">{titulo}</h2>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-xs">
          {items.map((item) => <li key={item.id} className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${item.tone}`} />{item.texto}</li>)}
        </ul>
      )}
      <button type="button" onClick={() => navigate(bajoMargen.length > 0 ? EMS_SECTION_PATHS.margenes : `${EMS_SECTION_PATHS.centros}?filtro=atencion`)}
        className="mt-auto rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover">
        {bajoMargen.length > 0 ? 'Revisar márgenes' : 'Ver centros'}
      </button>
    </section>
  );
}

function FlotaCard({ remarcadores }: Readonly<{ remarcadores: Remarcador[] }>) {
  const navigate = useNavigate();
  const count = (estado: RemarcadorEstado) => remarcadores.filter((r) => r.estado === estado).length;
  const conectados = count('conectado');
  const pct = remarcadores.length > 0 ? Math.round((conectados / remarcadores.length) * 100) : 0;
  const arc = Math.PI * 40;

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-accent p-5 text-accent-ink">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Flota en línea</h2>
        <button type="button" onClick={() => navigate(EMS_SECTION_PATHS.remarcadores)} aria-label="Ver remarcadores" className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-foreground hover:bg-raised">↗</button>
      </header>
      <div className="relative mx-auto w-40">
        <svg viewBox="0 0 100 55" className="w-full" aria-hidden="true">
          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" strokeLinecap="round" />
          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(arc * pct) / 100} ${arc}`} />
        </svg>
        <p className="absolute inset-x-0 bottom-0 text-center font-mono text-2xl font-semibold">{pct} %<span className="block font-sans text-[10px] font-normal opacity-70">en línea</span></p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([['Conectados', conectados], ['Sin señal', count('sin_senal')], ['Caídos', count('caido')]] as const).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface px-2.5 py-2 text-foreground">
            <p className="text-[10px] text-muted">{label}</p>
            <p className="font-mono text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function IncidenciasTable({ remarcadores }: Readonly<{ remarcadores: Remarcador[] }>) {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const texto = busqueda.trim().toLowerCase();
  const filtrados = remarcadores.filter((r) => texto === '' || [r.code, r.name, r.centroName].some((campo) => campo.toLowerCase().includes(texto)));
  const visibles = filtrados.slice(pagina * PAGINA, (pagina + 1) * PAGINA);
  const paginas = Math.max(1, Math.ceil(filtrados.length / PAGINA));

  return (
    <section className="rounded-xl bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-card-fg">Remarcadores que requieren atención</h2>
          <p className="text-xs text-card-muted">{remarcadores.length} equipos con incidencias · ordenados por severidad</p>
        </div>
        <SearchInput value={busqueda} onChange={(value) => { setBusqueda(value); setPagina(0); }} placeholder="Buscar remarcador" />
      </header>
      {filtrados.length === 0 ? (
        <p className="px-5 pb-8 pt-4 text-center text-sm text-muted">{remarcadores.length === 0 ? 'Toda la flota está conectada.' : 'Sin remarcadores con esa búsqueda.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap">
            <thead>
              <tr className="bg-raised">
                {['Remarcador', 'Centro', 'Señal', 'Última lectura', 'Estado'].map((label) => (
                  <th key={label} className="px-5 py-2.5 text-left text-[11px] font-normal text-muted">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {visibles.map((r) => {
                const abrir = () => navigate(`${EMS_SECTION_PATHS.remarcadores}/${r.id}`);
                return (
                  <tr key={r.id} tabIndex={0} onClick={abrir} onKeyDown={onRowKeyDown(abrir)} className="cursor-pointer hover:bg-raised">
                    <td className="px-5 py-3 font-mono text-sm text-foreground">{r.code}</td>
                    <td className="px-5 py-3"><p className="text-sm text-foreground">{r.centroName}</p><p className="text-[11px] text-muted">{r.name}</p></td>
                    <td className="px-5 py-3"><StatusBadge estado={r.estado} detail={formatSenal(r.senalPct)} /></td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{formatDateTime(r.ultimaLectura)}</td>
                    <td className="px-5 py-3"><StatusBadge estado={ESTADO_POR_SENAL[r.estado]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <footer className="flex items-center justify-between px-5 py-3 text-xs text-muted">
        <span>Mostrando {visibles.length} de {filtrados.length}</span>
        <div className="flex gap-2">
          <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-foreground disabled:opacity-40">Anterior</button>
          <button type="button" disabled={pagina >= paginas - 1} onClick={() => setPagina((p) => p + 1)} className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-foreground disabled:opacity-40">Siguiente</button>
        </div>
      </footer>
    </section>
  );
}
