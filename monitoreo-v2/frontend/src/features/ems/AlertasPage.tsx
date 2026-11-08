import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { useToastStore } from '../../store/useToastStore';
import { buildAlertasMargen, type AlertaSeveridad, type Regla } from './alerts';
import { formatNumber, inicialesDe } from './format';
import { PageAction } from './PageAction';
import { canEditSection } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { Switch } from './Switch';
import { RowMenu } from './table';
import { useEmsAlertas, useEmsFleet, type EmsAlerta } from './useEmsFleet';
import { useEmsRole } from './useEmsRole';
import { CANALES_LABELS, TIPOS_REGLA_LABELS, TODOS_LOS_CENTROS, useReglas } from './useReglas';

type Vista = 'activas' | 'resueltas' | 'historial';

const VISTAS: Record<Vista, string> = { activas: 'Activas', resueltas: 'Resueltas', historial: 'Historial' };
const SEVERIDAD: Record<AlertaSeveridad, { label: string; cls: string; orden: number }> = {
  critica: { label: '⊘ Alarma', cls: 'bg-danger text-white', orden: 0 },
  advertencia: { label: '⚠ Advertencia', cls: 'bg-warning-bg text-warning-ink', orden: 1 },
  informativa: { label: '⚙ Mantención', cls: 'bg-info-bg text-info-ink', orden: 2 },
};
const NOTIFICACIONES = ['Correo electrónico', 'Campana en la app', 'Resumen diario a las 08:00'];
const MINUTE_MS = 60_000;

export function duracion(desde: string | null, ahora: number): string {
  if (!desde) return '—';
  const minutos = Math.max(0, Math.round((ahora - new Date(desde).getTime()) / MINUTE_MS));
  if (minutos < 60) return `${minutos} m`;
  if (minutos < 24 * 60) return `${Math.floor(minutos / 60)} h ${minutos % 60} m`;
  return `${Math.floor(minutos / (24 * 60))} d`;
}

export function AlertasPage() {
  const navigate = useNavigate();
  const canEdit = canEditSection(useEmsRole(), 'alertas');
  const [vista, setVista] = useState<Vista>('activas');
  const [isCreatingRegla, setIsCreatingRegla] = useState(false);
  const [reglaPorEliminar, setReglaPorEliminar] = useState<Regla | null>(null);
  const [notificaciones, setNotificaciones] = useState<string[]>(NOTIFICACIONES.slice(0, 2));
  const { reglas, alternar, eliminar } = useReglas();
  const { phase, error, alertas } = useEmsAlertas();
  const fleet = useEmsFleet();
  const margenMinimo = useAppStore((s) => s.margenMinimo);
  const alertasResueltas = useAppStore((s) => s.alertasResueltas);
  const asignadas = useAppStore((s) => s.alertasAsignadas);
  const resolverAlertas = useAppStore((s) => s.resolverAlertas);
  const reabrirAlerta = useAppStore((s) => s.reabrirAlerta);
  const asignarAlerta = useAppStore((s) => s.asignarAlerta);
  const yo = useAuthStore((s) => s.user?.displayName ?? s.user?.email ?? 'Usuario');
  const showToast = useToastStore((s) => s.showToast);

  const ahora = Date.now();
  const deMargen: EmsAlerta[] = buildAlertasMargen(fleet.centros, margenMinimo, fleet.periodo)
    .map((alerta) => ({ ...alerta, isResuelta: alertasResueltas.includes(alerta.id) }));
  const todas = [...alertas, ...deMargen].sort((a, b) => SEVERIDAD[a.severidad].orden - SEVERIDAD[b.severidad].orden || (a.desde ?? '').localeCompare(b.desde ?? ''));
  const activas = todas.filter((a) => !a.isResuelta);
  const visibles = { activas, resueltas: todas.filter((a) => a.isResuelta), historial: todas }[vista];

  const alternarRegla = async (regla: Regla) => {
    if (await alternar(regla)) showToast(regla.activa ? 'Regla pausada' : 'Regla activada');
  };

  usePageTitle('Alertas', 'Add-ons / Alertas', canEdit ? <PageAction label="+ Nueva regla" onClick={() => setIsCreatingRegla(true)} /> : undefined);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <div className={`${SEGMENT_TRACK_CLASS} self-start`} role="tablist" aria-label="Vista">
          {(Object.keys(VISTAS) as Vista[]).map((key) => (
            <button key={key} type="button" role="tab" aria-selected={vista === key} onClick={() => setVista(key)} className={segmentClass(vista === key)}>
              {VISTAS[key]}{key === 'activas' ? ` · ${activas.length}` : ''}
            </button>
          ))}
        </div>

        <QueryStateView phase={phase} error={error}>
          <div className="grid items-start gap-4 xl:grid-cols-3">
            <section className="min-w-0 rounded-xl bg-card xl:col-span-2">
              <h2 className="px-5 py-4 text-sm font-semibold text-card-fg">Alertas {VISTAS[vista].toLowerCase()}</h2>
              {visibles.length === 0 ? <p className="px-5 pb-10 pt-4 text-center text-sm text-muted">Sin alertas en esta vista.</p> : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-raised">
                        {['Severidad', 'Alerta · centro', 'Inicio', 'Duración', 'Responsable', ''].map((label) => (
                          <th key={label} className="px-4 py-2.5 text-left text-[11px] font-normal text-muted">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {visibles.map((alerta) => {
                        const responsable = asignadas[alerta.id];
                        return (
                          <tr key={alerta.id} onClick={() => navigate(alerta.href)} className={`cursor-pointer hover:bg-raised ${alerta.isResuelta ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERIDAD[alerta.severidad].cls}`}>{SEVERIDAD[alerta.severidad].label}</span></td>
                            <td className="px-4 py-3"><p className="text-sm text-foreground">{alerta.titulo}</p><p className="text-[11px] text-muted">{alerta.centroName}</p></td>
                            <td className="px-4 py-3 font-mono text-xs text-muted">{alerta.desde ? new Date(alerta.desde).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-foreground">{duracion(alerta.desde, ahora)}</td>
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              {responsable
                                ? <span className="flex items-center gap-1.5 text-xs text-foreground"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-subtle text-[10px] font-semibold text-accent-ink">{inicialesDe(responsable)}</span>{responsable.split(' ')[0]}</span>
                                : canEdit && <button type="button" onClick={() => { asignarAlerta(alerta.id, yo); showToast('Alerta asignada a ti'); }} className="text-xs font-medium text-foreground hover:underline">Asignar</button>}
                            </td>
                            <td className="px-3 py-3">
                              {canEdit && <RowMenu label={`Acciones de ${alerta.titulo}`} items={[
                                { label: 'Ver detalle', onSelect: () => navigate(alerta.href) },
                                alerta.isResuelta
                                  ? { label: 'Reabrir', onSelect: () => reabrirAlerta(alerta.id) }
                                  : { label: 'Marcar resuelta', onSelect: () => { resolverAlertas([alerta.id]); showToast('Alerta resuelta'); } },
                              ]} />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="flex min-w-0 flex-col gap-4">
              <section className="rounded-xl bg-card p-5">
                <h2 className="mb-3 text-sm font-semibold text-card-fg">Reglas activas</h2>
                <ul className="flex flex-col gap-2">
                  <li className="flex items-center gap-3 rounded-lg bg-raised px-3 py-2.5">
                    <div className="flex-1"><p className="text-sm text-foreground">Desconexión de remarcador</p><p className="text-[11px] text-muted">Sin lecturas por 30 min · automática</p></div>
                    <Switch checked disabled label="Desconexión de remarcador" onChange={() => undefined} />
                  </li>
                  {reglas.map((regla) => (
                    <li key={regla.id} className="flex items-center gap-3 rounded-lg bg-raised px-3 py-2.5">
                      <div className="min-w-0 flex-1"><p className="truncate text-sm text-foreground">{regla.nombre}</p><p className="truncate text-[11px] text-muted">{regla.tipo} · {regla.aplicaA}</p></div>
                      <Switch checked={regla.activa} disabled={!canEdit} label={regla.nombre} onChange={() => void alternarRegla(regla)} />
                      {canEdit && <RowMenu label={`Opciones de ${regla.nombre}`} items={[{ label: 'Eliminar', onSelect: () => setReglaPorEliminar(regla), isDanger: true }]} />}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-muted">Margen bajo el mínimo usa el mínimo contractual de Márgenes ({formatNumber(margenMinimo)} %).</p>
              </section>

              <section className="rounded-xl bg-card p-5">
                <h2 className="mb-3 text-sm font-semibold text-card-fg">Notificarme por</h2>
                <div className="flex flex-col gap-2">
                  {NOTIFICACIONES.map((canal) => (
                    <label key={canal} className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" checked={notificaciones.includes(canal)} onChange={() => setNotificaciones((actual) => (actual.includes(canal) ? actual.filter((c) => c !== canal) : [...actual, canal]))} className="rounded border-border accent-[var(--color-primary)]" />
                      {canal}
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </QueryStateView>

        <ConfirmDialog
          open={reglaPorEliminar !== null}
          onClose={() => setReglaPorEliminar(null)}
          onConfirm={() => { const regla = reglaPorEliminar; setReglaPorEliminar(null); if (regla) void eliminar(regla).then((ok) => ok && showToast('Regla eliminada')); }}
          title="Eliminar regla"
          message={`«${reglaPorEliminar?.nombre ?? ''}» dejará de generar alertas. No afecta a las alertas ya emitidas.`}
        />
        <NuevaReglaModal open={isCreatingRegla} onClose={() => setIsCreatingRegla(false)} />
      </div>
    </div>
  );
}


const SELECT_CLASS = 'h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none';

function NuevaReglaModal({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const { agregar } = useReglas();
  const showToast = useToastStore((s) => s.showToast);
  const buildingsQuery = useBuildingsQuery();

  const crear = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const isSaved = await agregar({
      nombre: String(form.get('nombre')).trim() || 'Regla sin nombre',
      tipo: String(form.get('tipo')),
      aplicaA: String(form.get('aplicaA')),
      notifica: String(form.get('notifica')),
      activa: true,
    });
    if (!isSaved) return;
    formElement.reset();
    onClose();
    showToast('Regla creada y activada');
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva regla de alerta">
      <p className="mb-4 text-sm text-muted">Define cuándo debe avisar la plataforma.</p>
      <form onSubmit={(event) => void crear(event)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nombre
          <input name="nombre" placeholder="Pico sobre 1.200 kW" className={SELECT_CLASS} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tipo
          <select name="tipo" className={SELECT_CLASS}>
            {TIPOS_REGLA_LABELS.map((tipo) => <option key={tipo}>{tipo}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Aplica a
          <select name="aplicaA" className={SELECT_CLASS}>
            <option>{TODOS_LOS_CENTROS}</option>
            {(buildingsQuery.data ?? []).map((building) => <option key={building.id}>{building.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Notifica por
          <select name="notifica" className={SELECT_CLASS}>
            {CANALES_LABELS.map((canal) => <option key={canal}>{canal}</option>)}
          </select>
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-muted hover:text-foreground">Cancelar</button>
          <button type="submit" className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">+ Crear regla</button>
        </div>
      </form>
    </Modal>
  );
}
