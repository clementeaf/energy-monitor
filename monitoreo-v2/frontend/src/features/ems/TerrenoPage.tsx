import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useAppStore, type TareaTerreno } from '../../store/useAppStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { useToastStore } from '../../store/useToastStore';
import { buildFichaDispositivo } from './device';
import type { Remarcador } from './fleet';
import { formatDateTime, formatNumber } from './format';
import { EMS_SECTION_PATHS } from './roles';
import { StatusBadge } from './StatusBadge';
import { useEmsFleet } from './useEmsFleet';
import { useRemarcadorActions } from './useRemarcadorActions';

const CHECKLIST = ['Equipo energizado', 'Gateway y antena conectados', 'Sin daño físico ni humedad', 'Lectura forzada recibida'];
const PASO_LECTURA = CHECKLIST.length - 1;
const BUTTON_LG = 'flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold';
const MINUTE_MS = 60_000;
const BASE = EMS_SECTION_PATHS.terreno;

export function puedeCerrar(tarea: TareaTerreno): boolean {
  return CHECKLIST.every((_, paso) => tarea.checklist[paso] === true);
}

function TerrenoShell({ children }: Readonly<{ children: ReactNode }>) {
  const tab = ({ isActive }: { isActive: boolean }) => `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium ${isActive ? 'bg-primary text-primary-fg' : 'text-muted'}`;
  return (
    <div className="mx-auto flex h-full w-full max-w-[430px] flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      <nav className="sticky bottom-0 m-4 mt-0 flex gap-1 rounded-2xl bg-card p-1.5 shadow-float" aria-label="Terreno">
        <NavLink to={BASE} end className={tab}><span aria-hidden="true">☰</span>Tareas</NavLink>
        <NavLink to={EMS_SECTION_PATHS.remarcadores} className={tab}><span aria-hidden="true">⌁</span>Flota</NavLink>
        <NavLink to={`${BASE}/alta`} className={({ isActive }) => `${tab({ isActive })} ${isActive ? '' : 'text-accent-strong'}`}><span aria-hidden="true">＋</span>Alta</NavLink>
      </nav>
    </div>
  );
}

export function TerrenoTareasPage() {
  const navigate = useNavigate();
  const fleet = useEmsFleet();
  const tareas = useAppStore((s) => s.tareasTerreno);
  usePageTitle('Mis tareas', 'Técnico de Campo · terreno');
  const asignadas = fleet.remarcadores
    .flatMap((r) => (tareas[r.id] ? [{ remarcador: r, tarea: tareas[r.id] }] : []))
    .sort((a, b) => Number(b.tarea.isUrgente) - Number(a.tarea.isUrgente) || a.tarea.asignadaEn.localeCompare(b.tarea.asignadaEn));
  const [primera, ...resto] = asignadas;
  const abrir = (id: string) => navigate(`${BASE}/remarcadores/${id}`);

  return (
    <TerrenoShell>
      <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-surface px-3 py-1 text-foreground">{asignadas.length} tarea{asignadas.length === 1 ? '' : 's'}</span>
            <span className="rounded-full bg-danger-bg px-3 py-1 text-danger-ink">{asignadas.filter((a) => a.tarea.isUrgente).length} urgente</span>
          </div>
          {!primera ? (
            <p className="rounded-2xl bg-card px-4 py-10 text-center text-sm text-muted">Sin tareas asignadas. Llegan desde «Asignar a terreno» en Remarcadores o Alertas.</p>
          ) : (
            <section className="flex flex-col gap-3 rounded-2xl bg-primary p-4 text-primary-fg">
              <p className="flex items-center justify-between text-xs opacity-80">
                <span>{primera.tarea.isUrgente ? 'Urgente' : 'Siguiente'} · asignada {formatDateTime(primera.tarea.asignadaEn)}</span>
                <StatusBadge estado={primera.remarcador.estado} />
              </p>
              <h2 className="font-mono text-lg font-semibold">{primera.remarcador.code} · {primera.remarcador.name}</h2>
              <p className="text-sm opacity-80">{primera.remarcador.centroName}</p>
              <button type="button" onClick={() => abrir(primera.remarcador.id)} className={`${BUTTON_LG} bg-accent text-accent-ink`}>Iniciar diagnóstico</button>
            </section>
          )}
          {resto.length > 0 && <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">Más tarde</p>}
          {resto.map(({ remarcador, tarea }) => (
            <button key={remarcador.id} type="button" onClick={() => abrir(remarcador.id)} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-semibold text-foreground">{remarcador.code} · {remarcador.name}</p>
                <p className="truncate text-xs text-muted">{remarcador.centroName} · {formatDateTime(tarea.asignadaEn)}</p>
              </div>
              <StatusBadge estado={remarcador.estado} />
            </button>
          ))}
        </div>
      </QueryStateView>
    </TerrenoShell>
  );
}

export function TerrenoDiagnosticoPage() {
  const { remarcadorId = '' } = useParams<{ remarcadorId: string }>();
  const fleet = useEmsFleet();
  const rem = fleet.remarcadores.find((r) => r.id === remarcadorId);
  usePageTitle(rem ? `${rem.code} · ${rem.name}` : 'Remarcador', 'Diagnóstico en terreno');
  return (
    <TerrenoShell>
      <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
        {rem ? <Diagnostico rem={rem} /> : <p className="py-10 text-center text-sm text-muted">Remarcador no encontrado.</p>}
      </QueryStateView>
    </TerrenoShell>
  );
}

function Diagnostico({ rem }: Readonly<{ rem: Remarcador }>) {
  const navigate = useNavigate();
  const actions = useRemarcadorActions();
  const showToast = useToastStore((s) => s.showToast);
  const tarea = useAppStore((s) => s.tareasTerreno[rem.id]);
  const marcarChecklist = useAppStore((s) => s.marcarChecklist);
  const asignarTerreno = useAppStore((s) => s.asignarTerreno);
  const cerrarTarea = useAppStore((s) => s.cerrarTarea);
  const ficha = buildFichaDispositivo(rem);
  const haceMin = rem.ultimaLectura ? Math.round((Date.now() - new Date(rem.ultimaLectura).getTime()) / MINUTE_MS) : null;
  const hechos = tarea ? CHECKLIST.filter((_, paso) => tarea.checklist[paso]).length : 0;

  const forzar = () => {
    actions.forzarLectura([rem]);
    if (!tarea) asignarTerreno([rem.id], false);
    if (!tarea?.checklist[PASO_LECTURA]) marcarChecklist(rem.id, PASO_LECTURA);
  };
  const cerrar = () => {
    cerrarTarea(rem.id);
    showToast(`Tarea de ${rem.code} cerrada`);
    navigate(BASE);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2"><StatusBadge estado={rem.estado} /><span className="rounded-full bg-surface px-2.5 py-0.5 font-mono text-xs text-foreground">Señal {ficha.senalPct} %</span></div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ['Última lectura', rem.ultimaLectura ? new Date(rem.ultimaLectura).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—', haceMin === null ? '' : `hace ${formatNumber(haceMin)} min`],
          ['Potencia', formatNumber(rem.potenciaKw, 1), 'kW'],
          ['Centro', rem.centroName, ''],
          ['Señal', String(ficha.senalPct), '%'],
        ].map(([label, value, unit]) => (
          <div key={label} className="rounded-2xl bg-card px-3.5 py-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="truncate font-mono text-xl font-semibold text-foreground">{value} <span className="text-xs font-normal text-muted">{unit}</span></p>
          </div>
        ))}
      </div>
      <section className="flex flex-col gap-3 rounded-2xl bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Diagnóstico en terreno</h2>
        {CHECKLIST.map((paso, i) => (
          <label key={paso} className="flex items-center gap-3 text-sm text-foreground">
            <input type="checkbox" className="h-5 w-5" checked={tarea?.checklist[i] === true} disabled={!tarea || i === PASO_LECTURA}
              onChange={() => marcarChecklist(rem.id, i)} />
            {paso}{i === PASO_LECTURA && <span className="text-xs text-muted">(usa «Forzar lectura»)</span>}
          </label>
        ))}
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-raised"><div className="h-2 rounded-full bg-accent" style={{ width: `${(hechos / CHECKLIST.length) * 100}%` }} /></div>
          <span className="font-mono text-xs text-muted">{hechos}/{CHECKLIST.length}</span>
        </div>
        {!tarea && <p className="text-xs text-muted">Este equipo no tiene una tarea asignada: el checklist se activa al asignarla.</p>}
      </section>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={forzar} className={`${BUTTON_LG} border border-border bg-surface text-foreground`}>⚡ Forzar lectura</button>
        <button type="button" onClick={cerrar} disabled={!tarea || !puedeCerrar(tarea)} className={`${BUTTON_LG} bg-primary text-primary-fg disabled:opacity-40`}>Cerrar tarea</button>
      </div>
    </div>
  );
}

export function TerrenoAltaPage() {
  const fleet = useEmsFleet();
  const showToast = useToastStore((s) => s.showToast);
  const [serie, setSerie] = useState('');
  const [centroId, setCentroId] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [conexion, setConexion] = useState<'gateway' | 'directa'>('gateway');
  const [prueba, setPrueba] = useState<'pendiente' | 'ok' | 'sin_lecturas'>('pendiente');
  const paso = serie === '' ? 0 : centroId === '' || ubicacion === '' ? 1 : 2;
  usePageTitle('Alta de remarcador', 'Técnico de Campo · terreno');

  const probar = () => setPrueba(fleet.remarcadores.some((r) => r.centroId === centroId && r.estado === 'conectado') ? 'ok' : 'sin_lecturas');
  const activar = () => {
    showToast(`Alta de ${serie} enviada: aparecerá en la flota con su primera lectura`);
    setSerie(''); setCentroId(''); setUbicacion(''); setPrueba('pendiente');
  };
  const field = 'h-12 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none';

  return (
    <TerrenoShell>
      <form onSubmit={(event) => { event.preventDefault(); activar(); }} className="flex flex-col gap-3">
        <div className="flex gap-1.5" aria-label={`Paso ${paso + 1} de 3`}>
          {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= paso ? 'bg-accent' : 'bg-border'}`} />)}
        </div>
        <label className="flex flex-col gap-1 rounded-2xl bg-card p-4 text-xs text-muted">
          N° de serie (escanea o escribe)
          <input value={serie} onChange={(e) => setSerie(e.target.value.trim())} placeholder="LQN-2024-118422" className={`${field} font-mono`} />
        </label>
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
          <label className="flex flex-col gap-1 text-xs text-muted">Centro
            <select value={centroId} onChange={(e) => setCentroId(e.target.value)} className={field}>
              <option value="">Elegir centro…</option>
              {fleet.centros.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">Ubicación en el sitio
            <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Sala de tableros · TD-04" className={field} />
          </label>
          <fieldset className="flex flex-col gap-2 text-xs text-muted">
            <legend className="mb-1">Tipo de conexión</legend>
            <div className="flex gap-4 text-sm text-foreground">
              {(['gateway', 'directa'] as const).map((tipo) => (
                <label key={tipo} className="flex items-center gap-2"><input type="radio" className="h-5 w-5" checked={conexion === tipo} onChange={() => setConexion(tipo)} />{tipo === 'gateway' ? 'Vía gateway' : 'Directa'}</label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center justify-between text-sm text-foreground">
            Prueba de lectura
            {prueba === 'ok'
              ? <span className="rounded-full bg-success-bg px-3 py-1 text-xs font-medium text-success-ink">✓ Gateway del centro reportando</span>
              : <button type="button" disabled={paso < 2} onClick={probar} className={`rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-40 ${prueba === 'sin_lecturas' ? 'border-danger text-danger' : 'border-border'}`}>{prueba === 'sin_lecturas' ? 'Gateway sin lecturas · reintentar' : 'Probar'}</button>}
          </div>
        </div>
        <button type="submit" disabled={prueba !== 'ok'} className={`${BUTTON_LG} bg-primary text-primary-fg disabled:opacity-40`}>Activar remarcador</button>
      </form>
    </TerrenoShell>
  );
}
