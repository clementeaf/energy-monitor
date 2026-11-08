import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { useAppStore } from '../../store/useAppStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { useToastStore } from '../../store/useToastStore';
import type { Reading, ReadingResolution } from '../../types/reading';
import { buildFichaDispositivo } from './device';
import { toNumber, type Remarcador, type RemarcadorEstado } from './fleet';
import { formatDateTime, formatNumber } from './format';
import { PageAction } from './PageAction';
import { canEditSection, EMS_SECTION_PATHS } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { StatusBadge } from './StatusBadge';
import { RowMenu } from './table';
import { useEmsFleet } from './useEmsFleet';
import { useEmsRole } from './useEmsRole';
import { useRemarcadorActions } from './useRemarcadorActions';

type Rango = '24h' | '7d' | '30d';

const MINUTE_MS = 60_000;
const RANGOS: Record<Rango, { label: string; horas: number; tramoMin: number; resolution: ReadingResolution }> = {
  '24h': { label: '24 h', horas: 24, tramoMin: 15, resolution: '15min' },
  '7d': { label: '7 días', horas: 24 * 7, tramoMin: 60, resolution: '1h' },
  '30d': { label: '30 días', horas: 24 * 30, tramoMin: 360, resolution: '1h' },
};
const ULTIMAS_LECTURAS = 5;
const SENAL_SEGMENTOS = 10;
const ESTADO_OPERATIVO: Record<RemarcadorEstado, 'operativo' | 'advertencia' | 'alarma' | 'mantencion'> = {
  conectado: 'operativo', sin_senal: 'advertencia', caido: 'alarma', mantencion: 'mantencion',
};
const SECONDARY_BUTTON = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised';

export interface Tramo {
  inicio: number;
  kw: number | null;
  lectura: Reading | null;
}

export function construirTramos(readings: Reading[], hasta: number, horas: number, tramoMin: number): Tramo[] {
  const tramoMs = tramoMin * MINUTE_MS;
  const total = Math.round((horas * 60) / tramoMin);
  const desde = Math.floor(hasta / tramoMs) * tramoMs - (total - 1) * tramoMs;
  const porTramo = new Map<number, Reading[]>();
  for (const reading of readings) {
    const indice = Math.floor((new Date(reading.timestamp).getTime() - desde) / tramoMs);
    if (indice < 0 || indice >= total) continue;
    porTramo.set(indice, [...(porTramo.get(indice) ?? []), reading]);
  }
  return Array.from({ length: total }, (_, indice) => {
    const propias = porTramo.get(indice) ?? [];
    const potencias = propias.flatMap((r) => { const kw = toNumber(r.power_kw); return kw === null ? [] : [kw]; });
    return {
      inicio: desde + indice * tramoMs,
      kw: potencias.length > 0 ? potencias.reduce((sum, kw) => sum + kw, 0) / potencias.length : null,
      lectura: propias.at(-1) ?? null,
    };
  });
}

export function RemarcadorDetailPage() {
  const { remarcadorId = '' } = useParams<{ remarcadorId: string }>();
  const fleet = useEmsFleet();
  const canEdit = canEditSection(useEmsRole(), 'remarcadores');
  const actions = useRemarcadorActions();
  const rem = fleet.remarcadores.find((r) => r.id === remarcadorId);

  usePageTitle(rem ? `${rem.code} · ${rem.name}` : 'Remarcador', `Núcleo / Remarcadores / ${rem?.code ?? ''}`,
    rem && canEdit ? <PageAction label="⚡ Forzar lectura" onClick={() => actions.forzarLectura([rem])} /> : undefined);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
        {rem ? <RemarcadorDetalle rem={rem} canEdit={canEdit} /> : <div className="flex h-full items-center justify-center text-sm text-muted">Remarcador no encontrado.</div>}
      </QueryStateView>
    </div>
  );
}

function RemarcadorDetalle({ rem, canEdit }: Readonly<{ rem: Remarcador; canEdit: boolean }>) {
  const navigate = useNavigate();
  const actions = useRemarcadorActions();
  const showToast = useToastStore((s) => s.showToast);
  const asignarTerreno = useAppStore((s) => s.asignarTerreno);
  const [rango, setRango] = useState<Rango>('24h');
  const [isConfirmingReinicio, setIsConfirmingReinicio] = useState(false);
  const ficha = buildFichaDispositivo(rem);
  const ahora = useMemo(() => Date.now(), []);
  const { horas, tramoMin, resolution } = RANGOS[rango];
  const range = useMemo(() => ({ from: new Date(ahora - horas * 60 * MINUTE_MS).toISOString(), to: new Date(ahora).toISOString() }), [ahora, horas]);
  const readingsQuery = useReadingsQuery({ meterId: rem.id, ...range, resolution }, true);
  const ultimasQuery = useReadingsQuery({ meterId: rem.id, from: new Date(ahora - 2 * 60 * MINUTE_MS).toISOString(), to: new Date(ahora).toISOString() }, true);
  const tramos = useMemo(() => construirTramos(readingsQuery.data ?? [], ahora, horas, tramoMin), [readingsQuery.data, ahora, horas, tramoMin]);
  const ultimas = useMemo(() => construirTramos(ultimasQuery.data ?? [], ahora, 2, 15).slice(-ULTIMAS_LECTURAS).reverse(), [ultimasQuery.data, ahora]);
  const haceMin = rem.ultimaLectura ? Math.round((ahora - new Date(rem.ultimaLectura).getTime()) / MINUTE_MS) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge estado={ESTADO_OPERATIVO[rem.estado]} />
        <StatusBadge estado={rem.estado} detail={`${ficha.senalPct} %`} />
        <button type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.centros}/${rem.centroId}`)} className="rounded-md bg-surface px-2 py-0.5 text-xs text-foreground hover:bg-raised">{rem.centroName}</button>
        <span className="font-mono text-xs text-muted">Última lectura {formatDateTime(rem.ultimaLectura)}{haceMin !== null && ` · hace ${formatNumber(haceMin)} min`}</span>
        {canEdit && (
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => { asignarTerreno([rem.id], rem.estado === 'caido'); showToast(`${rem.code} asignado a terreno`); }} className={SECONDARY_BUTTON}>Asignar a terreno</button>
            <button type="button" onClick={() => setIsConfirmingReinicio(true)} className={SECONDARY_BUTTON}>⚡ Reiniciar equipo</button>
            <RowMenu label="Más acciones" items={[
              rem.estado === 'mantencion' ? { label: 'Reactivar', onSelect: () => actions.reactivar(rem) } : { label: 'Marcar en mantención', onSelect: () => actions.marcarMantencion([rem]) },
              { label: 'Ir al centro', onSelect: () => navigate(`${EMS_SECTION_PATHS.centros}/${rem.centroId}`) },
            ]} />
          </div>
        )}
      </div>

      <EstadoBanner remarcador={rem} onVerAlerta={() => navigate(EMS_SECTION_PATHS.alertas)} onRecuperar={() => actions.recuperar(rem)} canEdit={canEdit} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <section className="rounded-xl bg-card p-5">
            <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-card-fg">Potencia · últimas {RANGOS[rango].label}</h2>
                <p className="text-xs text-card-muted">kW promedio cada {tramoMin >= 60 ? `${tramoMin / 60} h` : `${tramoMin} min`} · gris claro: sin datos</p>
              </div>
              <div role="tablist" aria-label="Rango" className={SEGMENT_TRACK_CLASS}>
                {(Object.keys(RANGOS) as Rango[]).map((key) => (
                  <button key={key} type="button" role="tab" aria-selected={rango === key} onClick={() => setRango(key)} className={segmentClass(rango === key)}>{RANGOS[key].label}</button>
                ))}
              </div>
            </header>
            <QueryStateView phase={readingsQuery.isError ? 'error' : readingsQuery.isPending ? 'loading' : 'ready'} error={readingsQuery.error} refetch={() => void readingsQuery.refetch()} variant="widget">
              <PotenciaTramos tramos={tramos} />
            </QueryStateView>
          </section>

          <section className="rounded-xl bg-card">
            <h2 className="px-5 py-4 text-sm font-semibold text-card-fg">Últimas lecturas</h2>
            <QueryStateView phase={ultimasQuery.isError ? 'error' : ultimasQuery.isPending ? 'loading' : 'ready'} error={ultimasQuery.error} refetch={() => void ultimasQuery.refetch()} variant="widget">
              <div className="overflow-x-auto">
                <table className="min-w-full whitespace-nowrap">
                  <thead>
                    <tr className="bg-raised">
                      {['Fecha y hora', 'Energía (kWh)', 'Potencia (kW)', 'Tensión (V)', 'Calidad'].map((label) => (
                        <th key={label} className="px-5 py-2 text-left text-[11px] font-normal text-muted">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border font-mono text-xs">
                    {ultimas.map((tramo) => (
                      <tr key={tramo.inicio}>
                        <td className="px-5 py-2.5 text-foreground">{formatDateTime(tramo.lectura?.timestamp ?? new Date(tramo.inicio).toISOString())}</td>
                        <td className="px-5 py-2.5">{tramo.lectura ? formatNumber(toNumber(tramo.lectura.energy_kwh_total), 1) : '—'}</td>
                        <td className="px-5 py-2.5">{tramo.lectura ? formatNumber(toNumber(tramo.lectura.power_kw), 1) : '—'}</td>
                        <td className="px-5 py-2.5">{tramo.lectura ? formatNumber(toNumber(tramo.lectura.voltage_l1), 1) : '—'}</td>
                        <td className="px-5 py-2.5 font-sans">
                          {tramo.lectura
                            ? <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-medium text-success-ink">✓ Válida</span>
                            : <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[11px] font-medium text-neutral-ink">○ Sin dato</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </QueryStateView>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-card-fg">Ficha del equipo</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              {[
                ['Modelo', ficha.modelo],
                ['ID remarcador', rem.idRemarcador ?? '—'],
                ['Ubicación', rem.name],
                ['Instalado', new Date(`${ficha.alta}T12:00:00`).toLocaleDateString('es-CL')],
                ['Comunicación', [rem.protocolo, rem.fuente].filter(Boolean).join(' · ') || '—'],
                ['Intervalo de lectura', '15 min'],
              ].map(([label, value]) => (
                <div key={label} className="contents"><dt className="text-muted">{label}</dt><dd className="font-mono text-foreground">{value}</dd></div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl bg-card p-5">
            <header className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-card-fg">Nivel de señal</h2>
              <span className={`font-mono text-2xl font-semibold ${ficha.senalPct >= 60 ? 'text-success' : ficha.senalPct > 0 ? 'text-warning-ink' : 'text-danger'}`}>{ficha.senalPct} %</span>
            </header>
            <div className="mt-2 flex gap-0.5" aria-hidden="true">
              {Array.from({ length: SENAL_SEGMENTOS }, (_, i) => (
                <span key={i} className={`h-3 flex-1 rounded-sm ${i < Math.round(ficha.senalPct / SENAL_SEGMENTOS) ? (ficha.senalPct >= 60 ? 'bg-accent' : 'bg-warning') : 'bg-border'}`} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Señal estimada según la regularidad de lecturas del equipo.</p>
          </section>

          <section className="rounded-xl bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-card-fg">Historial de eventos</h2>
            <ol className="flex flex-col gap-3 border-l border-border pl-4">
              {[
                ...(rem.estado !== 'conectado' ? [{ titulo: rem.estado === 'caido' ? 'Sin lecturas: equipo caído' : rem.estado === 'sin_senal' ? 'Señal intermitente' : 'En mantención', fecha: formatDateTime(rem.ultimaLectura), tono: 'bg-warning' }] : []),
                { titulo: 'Última lectura recibida', fecha: formatDateTime(rem.ultimaLectura), tono: 'bg-success' },
                { titulo: 'Alta del equipo', fecha: new Date(`${ficha.alta}T12:00:00`).toLocaleDateString('es-CL'), tono: 'bg-border-strong' },
              ].map((evento) => (
                <li key={evento.titulo} className="relative">
                  <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${evento.tono}`} />
                  <p className="text-sm text-foreground">{evento.titulo}</p>
                  <p className="font-mono text-[11px] text-muted">{evento.fecha} · Sistema</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={isConfirmingReinicio}
        onClose={() => setIsConfirmingReinicio(false)}
        onConfirm={() => { setIsConfirmingReinicio(false); actions.reiniciar(rem); }}
        title={`Reiniciar ${rem.code}`}
        message="El equipo dejará de reportar unos 2 minutos. La acción queda registrada en el historial."
        confirmLabel="Reiniciar"
      />
    </div>
  );
}

function PotenciaTramos({ tramos }: Readonly<{ tramos: Tramo[] }>) {
  const max = Math.max(...tramos.map((t) => t.kw ?? 0), 1);
  const etiquetas = [0, Math.floor(tramos.length / 4), Math.floor(tramos.length / 2), Math.floor((tramos.length * 3) / 4), tramos.length - 1];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-44 items-end gap-px">
        {tramos.map((tramo) => (
          <div key={tramo.inicio}
            title={tramo.kw === null ? `${formatDateTime(new Date(tramo.inicio).toISOString())} · sin lectura recibida` : `${formatDateTime(new Date(tramo.inicio).toISOString())} · ${formatNumber(tramo.kw, 1)} kW`}
            className={`flex-1 rounded-t-[1px] ${tramo.kw === null ? 'bg-raised' : 'bg-border-strong'}`}
            style={{ height: tramo.kw === null ? '100%' : `${Math.max(3, (tramo.kw / max) * 100)}%` }} />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted">
        {etiquetas.map((i) => <span key={i}>{formatDateTime(new Date(tramos[i]?.inicio ?? 0).toISOString())}</span>)}
      </div>
    </div>
  );
}

function EstadoBanner({ remarcador, onVerAlerta, onRecuperar, canEdit }: Readonly<{ remarcador: Remarcador; onVerAlerta: () => void; onRecuperar: () => void; canEdit: boolean }>) {
  const banners: Partial<Record<RemarcadorEstado, { cls: string; titulo: string; texto: string }>> = {
    caido: { cls: 'bg-danger-bg text-danger-ink', titulo: `Dispositivo sin conexión desde ${formatDateTime(remarcador.ultimaLectura)}`, texto: 'La plataforma ya generó la alerta de desconexión: al recuperar el equipo, la alerta se cierra sola.' },
    sin_senal: { cls: 'bg-warning-bg text-warning-ink', titulo: `Señal intermitente desde ${formatDateTime(remarcador.ultimaLectura)}`, texto: 'Las lecturas llegan con retraso. Si no se recibe una lectura en las próximas 24 h, el equipo pasa a caído y se genera la alerta.' },
    mantencion: { cls: 'bg-info-bg text-info-ink', titulo: 'Equipo en mantención', texto: 'Mientras dure la intervención no se generan alertas de desconexión para este equipo.' },
  };
  const banner = banners[remarcador.estado];
  if (!banner) return null;
  return (
    <div role="alert" className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ${banner.cls}`}>
      <div className="flex-1">
        <p className="text-sm font-medium">⚠ {banner.titulo}</p>
        <p className="text-xs">{banner.texto}</p>
      </div>
      {remarcador.estado === 'caido' && <button type="button" onClick={onVerAlerta} className="text-xs font-medium underline">Ver la alerta</button>}
      {canEdit && remarcador.estado !== 'mantencion' && <button type="button" onClick={onRecuperar} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-foreground">Reintentar enlace</button>}
    </div>
  );
}
