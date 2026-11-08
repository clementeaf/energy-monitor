import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Modal } from '../../components/ui/Modal';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useAppStore } from '../../store/useAppStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { useToastStore } from '../../store/useToastStore';
import { buildFichaDispositivo } from './device';
import type { Remarcador, RemarcadorEstado } from './fleet';
import { formatDateTime, formatNumber } from './format';
import { KpiTile } from './KpiTile';
import { PageAction } from './PageAction';
import { canEditSection, EMS_SECTION_PATHS } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { StatusBadge } from './StatusBadge';
import { BulkBar, EmptyFilterState, onRowKeyDown, RowMenu, SearchInput, SelectAllCheckbox, SortableTh, sortRows, useSelection, useSort } from './table';
import { useEmsFleet } from './useEmsFleet';
import { useEmsRole } from './useEmsRole';
import { useRemarcadorActions } from './useRemarcadorActions';

type Vista = 'todos' | 'incidencias' | 'centro';
type SortKey = 'code' | 'centro' | 'senal' | 'ultima';

const VISTAS: Record<Vista, string> = { todos: 'Todos', incidencias: 'Con incidencias', centro: 'Por centro' };
const SEVERIDAD: RemarcadorEstado[] = ['caido', 'sin_senal', 'mantencion', 'conectado'];
const ESTADO_OPERATIVO: Record<RemarcadorEstado, 'operativo' | 'advertencia' | 'alarma' | 'mantencion'> = {
  conectado: 'operativo', sin_senal: 'advertencia', caido: 'alarma', mantencion: 'mantencion',
};
const SORT_GETTERS: Record<SortKey, (remarcador: Remarcador) => string | number> = {
  code: (r) => r.code,
  centro: (r) => r.centroName,
  senal: (r) => SEVERIDAD.indexOf(r.estado) * 1000 - buildFichaDispositivo(r).senalPct,
  ultima: (r) => r.ultimaLectura ?? '',
};
const POR_PAGINA = 25;
const FIELD_CLASS = 'h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:border-accent focus:outline-none';
const SECONDARY_BUTTON = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised';

export function RemarcadoresPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { phase, error, refetch, remarcadores } = useEmsFleet();
  const canEdit = canEditSection(useEmsRole(), 'remarcadores');
  const actions = useRemarcadorActions();
  const showToast = useToastStore((s) => s.showToast);
  const asignarTerreno = useAppStore((s) => s.asignarTerreno);
  const aTerreno = (lista: Remarcador[]) => {
    asignarTerreno(lista.map((r) => r.id), lista.some((r) => r.estado === 'caido'));
    showToast(`${lista.length} tarea${lista.length === 1 ? '' : 's'} asignada${lista.length === 1 ? '' : 's'} a terreno`);
  };
  const [vista, setVista] = useState<Vista>(searchParams.get('centro') ? 'centro' : 'todos');
  const [centroId, setCentroId] = useState(searchParams.get('centro') ?? '');
  const [estado, setEstado] = useState<RemarcadorEstado | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const [isAlta, setIsAlta] = useState(false);
  const selection = useSelection();
  const { sort, toggleSort } = useSort<SortKey>({ key: 'senal', direction: 'asc' });

  const count = (e: RemarcadorEstado) => remarcadores.filter((r) => r.estado === e).length;
  const pct = (n: number) => (remarcadores.length > 0 ? formatNumber((n / remarcadores.length) * 100) : '0');
  const caidos = remarcadores.filter((r) => r.estado === 'caido');
  const centrosAfectados = new Set(caidos.map((r) => r.centroId)).size;
  const centros = [...new Map(remarcadores.map((r) => [r.centroId, r.centroName]))].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const texto = busqueda.trim().toLowerCase();
  const filtrados = sortRows(remarcadores.filter((r) =>
    (vista !== 'incidencias' || r.estado !== 'conectado')
    && (vista !== 'centro' || centroId === '' || r.centroId === centroId)
    && (estado === null || r.estado === estado)
    && (texto === '' || [r.code, r.name, r.centroName].some((campo) => campo.toLowerCase().includes(texto)))), sort, SORT_GETTERS);
  const visibles = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const seleccion = remarcadores.filter((r) => selection.selected.has(r.id));

  const filtrarEstado = (e: RemarcadorEstado | null) => { setEstado(e); setVista('todos'); setPagina(0); };
  const quitarFiltros = () => { setVista('todos'); setEstado(null); setBusqueda(''); setCentroId(''); setPagina(0); };
  const enLote = (accion: (lista: Remarcador[]) => void) => { accion(seleccion); selection.clear(); };

  usePageTitle('Remarcadores', 'Núcleo / Remarcadores', canEdit ? <PageAction label="+ Alta de remarcador" onClick={() => setIsAlta(true)} /> : undefined);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <QueryStateView phase={phase} error={error} refetch={refetch}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiTile variant="inverse" label="Remarcadores en la flota" value={String(remarcadores.length)} sub={`${centros.length} centros`} onClick={() => filtrarEstado(null)} />
            <KpiTile label="Conectados" value={String(count('conectado'))} unit={`${pct(count('conectado'))} %`} onClick={() => filtrarEstado('conectado')} />
            <KpiTile label="Sin señal" value={String(count('sin_senal'))} unit={`${pct(count('sin_senal'))} %`} onClick={() => filtrarEstado('sin_senal')} />
            <KpiTile label="Caídos" value={String(count('caido'))} unit={`${pct(count('caido'))} %`} tone={caidos.length > 0 ? 'negative' : 'neutral'} onClick={() => filtrarEstado('caido')} />
            <KpiTile label="En mantención" value={String(count('mantencion'))} unit={`${pct(count('mantencion'))} %`} onClick={() => filtrarEstado('mantencion')} />
          </div>

          {caidos.length > 0 && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-danger-bg px-4 py-3 text-danger-ink">
              <div className="flex-1">
                <p className="text-sm font-medium">⊘ {caidos.length} remarcador{caidos.length === 1 ? '' : 'es'} caído{caidos.length === 1 ? '' : 's'} · {centrosAfectados} centro{centrosAfectados === 1 ? '' : 's'} sin lecturas completas</p>
                <p className="text-xs">{caidos[0].centroName} ({caidos[0].code}) no reporta desde {formatDateTime(caidos[0].ultimaLectura)}. Las notas de cobro de estos centros quedan pendientes hasta completar lecturas.</p>
              </div>
              <button type="button" onClick={() => filtrarEstado('caido')} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-foreground">Ver caídos</button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className={SEGMENT_TRACK_CLASS} role="tablist" aria-label="Vista rápida">
              {(Object.keys(VISTAS) as Vista[]).map((key) => (
                <button key={key} type="button" role="tab" aria-selected={vista === key} onClick={() => { setVista(key); setEstado(null); setPagina(0); }} className={segmentClass(vista === key)}>
                  {VISTAS[key]}{key === 'todos' ? ` · ${remarcadores.length}` : key === 'incidencias' ? ` · ${remarcadores.length - count('conectado')}` : ''}
                </button>
              ))}
            </div>
            {vista === 'centro' && (
              <select value={centroId} onChange={(event) => { setCentroId(event.target.value); setPagina(0); }} aria-label="Centro" className={FIELD_CLASS}>
                <option value="">Todos los centros</option>
                {centros.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            )}
            {estado && <button type="button" onClick={() => filtrarEstado(null)} className="rounded-full bg-surface px-2.5 py-1 text-xs text-foreground">Estado: <StatusBadge estado={estado} /> ✕</button>}
            <div className="ml-auto"><SearchInput value={busqueda} onChange={(value) => { setBusqueda(value); setPagina(0); }} placeholder="Buscar remarcador" /></div>
          </div>

          {canEdit && (
            <BulkBar count={selection.selected.size} noun="equipo" onClear={selection.clear}>
              <button type="button" onClick={() => enLote(actions.forzarLectura)} className={SECONDARY_BUTTON}>↻ Forzar lectura</button>
              <button type="button" onClick={() => enLote(aTerreno)} className={SECONDARY_BUTTON}>Asignar a terreno</button>
            </BulkBar>
          )}

          <section className="rounded-xl bg-card">
            <header className="px-5 py-4">
              <h2 className="text-sm font-semibold text-card-fg">Flota de remarcadores</h2>
              <p className="text-xs text-card-muted">{filtrados.length} equipos · ordenados por severidad</p>
            </header>
            {filtrados.length === 0 ? (
              <EmptyFilterState title="Sin equipos que coincidan" text="Ajusta la búsqueda o la vista para volver a ver la flota." onReset={quitarFiltros} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-raised">
                      <th className="w-10 px-4 py-2.5">{canEdit && <SelectAllCheckbox selectedCount={visibles.filter((r) => selection.selected.has(r.id)).length} totalCount={visibles.length} onToggle={() => selection.toggleAll(visibles.map((r) => r.id))} />}</th>
                      <SortableTh label="Remarcador" sortKey="code" sort={sort} onToggle={toggleSort} />
                      <SortableTh label="Centro" sortKey="centro" sort={sort} onToggle={toggleSort} />
                      <SortableTh label="Señal" sortKey="senal" sort={sort} onToggle={toggleSort} />
                      <SortableTh label="Última lectura" sortKey="ultima" sort={sort} onToggle={toggleSort} />
                      <th className="px-5 py-2.5 text-left text-[11px] font-normal text-muted">Estado</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {visibles.map((r) => {
                      const abrir = () => navigate(`${EMS_SECTION_PATHS.remarcadores}/${r.id}`);
                      return (
                        <tr key={r.id} tabIndex={0} onClick={abrir} onKeyDown={onRowKeyDown(abrir)} className={`cursor-pointer hover:bg-raised ${selection.selected.has(r.id) ? 'bg-accent-subtle' : ''}`}>
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            {canEdit && <input type="checkbox" aria-label={`Seleccionar ${r.code}`} checked={selection.selected.has(r.id)} onChange={() => selection.toggle(r.id)} className="rounded border-border" />}
                          </td>
                          <td className="px-5 py-3 font-mono text-sm font-medium text-foreground">{r.code}</td>
                          <td className="px-5 py-3"><p className="text-sm text-foreground">{r.centroName}</p><p className="text-[11px] text-muted">{r.name}</p></td>
                          <td className="px-5 py-3"><StatusBadge estado={r.estado} detail={`${buildFichaDispositivo(r).senalPct} %`} /></td>
                          <td className="px-5 py-3 font-mono text-xs text-muted">{formatDateTime(r.ultimaLectura)}</td>
                          <td className="px-5 py-3"><StatusBadge estado={ESTADO_OPERATIVO[r.estado]} /></td>
                          <td className="px-3 py-3">
                            <RowMenu label={`Acciones de ${r.code}`} items={[
                              { label: 'Abrir detalle', onSelect: abrir },
                              ...(canEdit ? [
                                { label: 'Forzar lectura', onSelect: () => actions.forzarLectura([r]) },
                                { label: 'Marcar en mantención', onSelect: () => actions.marcarMantencion([r]) },
                                { label: 'Asignar a terreno', onSelect: () => aTerreno([r]) },
                              ] : []),
                            ]} />
                          </td>
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
                <button type="button" disabled={(pagina + 1) * POR_PAGINA >= filtrados.length} onClick={() => setPagina((p) => p + 1)} className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-foreground disabled:opacity-40">Siguiente</button>
              </div>
            </footer>
          </section>
        </div>
        <Modal open={isAlta} onClose={() => setIsAlta(false)} title="Alta de remarcador">
          <div className="flex flex-col gap-3 text-sm text-muted">
            <p>Los remarcadores se registran solos con su primera lectura: Varelectric envía el edificio y el <span className="font-mono text-foreground">id_remarcador</span>, y el equipo aparece aquí como <span className="text-foreground">Remarcador &lt;id&gt;</span> en su centro.</p>
            <p>Para un equipo nuevo, configúralo en el sistema de Varelectric con el edificio correcto. En terreno, el Técnico de Campo puede verificar la primera lectura desde la app mobile.</p>
            <div className="flex justify-end"><button type="button" onClick={() => setIsAlta(false)} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-fg">Entendido</button></div>
          </div>
        </Modal>
      </QueryStateView>
    </div>
  );
}
