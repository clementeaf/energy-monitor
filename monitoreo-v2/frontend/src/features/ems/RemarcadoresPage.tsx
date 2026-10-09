import { useState } from 'react';
import { useNavigate } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { buildFichaDispositivo } from './device';
import type { Remarcador, RemarcadorEstado } from './fleet';
import { formatDateTime, formatNumber } from './format';
import { StatusBadge } from './StatusBadge';
import { BulkBar, EmptyFilterState, onRowKeyDown, SearchInput, SelectAllCheckbox, SortableTh, sortRows, useSelection, useSort } from './table';
import { useEmsFleet } from './useEmsFleet';
import { useRemarcadorActions } from './useRemarcadorActions';

type Filtro = 'todos' | RemarcadorEstado;

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'conectado', label: 'Conectados' },
  { key: 'sin_senal', label: 'Sin señal' },
  { key: 'caido', label: 'Caídos' },
  { key: 'mantencion', label: 'En mantención' },
];

type SortKey = 'code' | 'nombre' | 'centro' | 'senal' | 'potencia' | 'ultima';

const SORT_GETTERS: Record<SortKey, (remarcador: Remarcador) => string | number> = {
  code: (r) => r.code,
  nombre: (r) => r.name,
  centro: (r) => r.centroName,
  senal: (r) => buildFichaDispositivo(r).senalPct,
  potencia: (r) => r.potenciaKw ?? -1,
  ultima: (r) => r.ultimaLectura ?? '',
};

const SECONDARY_BUTTON = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised';

function filtrar(remarcadores: Remarcador[], filtro: Filtro, busqueda: string): Remarcador[] {
  const q = busqueda.toLowerCase();
  return remarcadores.filter((r) =>
    (filtro === 'todos' || r.estado === filtro)
    && (!q || [r.code, r.name, r.centroName].some((text) => text.toLowerCase().includes(q))));
}

export function RemarcadoresPage() {
  const navigate = useNavigate();
  const { phase, error, refetch, remarcadores } = useEmsFleet();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const selection = useSelection();
  const { sort, toggleSort } = useSort<SortKey>({ key: 'code', direction: 'asc' });
  const actions = useRemarcadorActions();

  const conectados = remarcadores.filter((r) => r.estado === 'conectado').length;
  const sinSenal = remarcadores.filter((r) => r.estado === 'sin_senal').length;
  const caidos = remarcadores.filter((r) => r.estado === 'caido').length;
  const desconectado = remarcadores.find((r) => r.estado === 'caido');
  const pctConectados = remarcadores.length > 0 ? (conectados / remarcadores.length) * 100 : 0;

  const remarcadoresFiltrados = sortRows(filtrar(remarcadores, filtro, busqueda), sort, SORT_GETTERS);
  const idsFiltrados = remarcadoresFiltrados.map((r) => r.id);
  const seleccionadosVisibles = idsFiltrados.filter((id) => selection.selected.has(id)).length;
  const remarcadoresSeleccionados = remarcadores.filter((r) => selection.selected.has(r.id));

  const buscar = (value: string) => {
    setBusqueda(value);
    selection.clear();
  };
  const quitarFiltros = () => {
    setBusqueda('');
    setFiltro('todos');
  };
  const actuarSobreSeleccion = (accion: (seleccion: Remarcador[]) => void) => {
    accion(remarcadoresSeleccionados);
    selection.clear();
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:overflow-hidden md:p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Remarcadores</h1>
        <p className="text-xs text-muted">{remarcadores.length} dispositivos en la flota</p>
      </div>

      <QueryStateView phase={phase} error={error} refetch={refetch}>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Dispositivos" value={String(remarcadores.length)} sub={`${new Set(remarcadores.map((r) => r.centroId)).size} centros cubiertos`} />
        <StatCard label="Conectados" value={String(conectados)} sub={`${formatNumber(pctConectados, 1)}% de la flota`} positive />
        <StatCard label="Sin señal" value={String(sinSenal)} sub="Sin lecturas hace más de 30 min" />
        <StatCard label="Caídos" value={String(caidos)} sub="Sin lecturas hace más de 24 h" negative={caidos > 0} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={busqueda} onChange={buscar} placeholder="Buscar por ID, nombre o centro" />
          <div className="flex flex-wrap gap-1">
            {FILTROS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltro(f.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filtro === f.key ? 'bg-accent text-accent-ink' : 'border border-border text-foreground hover:bg-surface'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => actions.forzarLectura(remarcadores)} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
          ↻ Forzar lectura
        </button>
      </div>

      <BulkBar count={selection.selected.size} noun="equipo" onClear={selection.clear}>
        <button type="button" onClick={() => actuarSobreSeleccion(actions.forzarLectura)} className={SECONDARY_BUTTON}>↻ Forzar lectura</button>
        <button type="button" onClick={() => actuarSobreSeleccion(actions.marcarMantencion)} className={SECONDARY_BUTTON}>⚙ Marcar en mantención</button>
      </BulkBar>

      {desconectado && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-danger">⊘</span>
            <div>
              <p className="text-sm font-medium text-foreground">{desconectado.code} sin reportar desde {formatDateTime(desconectado.ultimaLectura)}</p>
              <p className="text-xs text-muted">{desconectado.centroName} · {caidos} remarcadores sin lecturas en las últimas 24 h.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="text-xs font-medium text-foreground hover:underline" onClick={() => navigate('/alertas')}>
              Ver alertas
            </button>
            <button type="button" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised" onClick={() => navigate(`/remarcadores/${desconectado.id}`)}>
              Diagnosticar
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-xl border border-card-border bg-card md:min-h-0">
        {remarcadoresFiltrados.length === 0 ? (
          <EmptyFilterState title="Sin equipos que coincidan" text="Ajusta la búsqueda o el filtro de estado para volver a ver la flota." onReset={quitarFiltros} />
        ) : (
        <>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-card-border">
                <th className="w-10 px-4 py-2.5">
                  <SelectAllCheckbox selectedCount={seleccionadosVisibles} totalCount={idsFiltrados.length} onToggle={() => selection.toggleAll(idsFiltrados)} />
                </th>
                <SortableTh label="ID" sortKey="code" sort={sort} onToggle={toggleSort} />
                <SortableTh label="Nombre" sortKey="nombre" sort={sort} onToggle={toggleSort} />
                <SortableTh label="Centro" sortKey="centro" sort={sort} onToggle={toggleSort} />
                <SortableTh label="Señal" sortKey="senal" sort={sort} onToggle={toggleSort} />
                <SortableTh label="Potencia" sortKey="potencia" sort={sort} onToggle={toggleSort} />
                <SortableTh label="Última lectura" sortKey="ultima" sort={sort} onToggle={toggleSort} />
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {remarcadoresFiltrados.map((r) => (
                <tr key={r.id} tabIndex={0} className={`cursor-pointer hover:bg-surface ${selection.selected.has(r.id) ? 'bg-accent/10' : ''}`} onClick={() => navigate(`/remarcadores/${r.id}`)} onKeyDown={onRowKeyDown(() => navigate(`/remarcadores/${r.id}`))}>
                  <td className="w-10 px-4 py-3">
                    <input type="checkbox" aria-label={`Seleccionar ${r.code}`} checked={selection.selected.has(r.id)} onChange={() => selection.toggle(r.id)} onClick={(e) => e.stopPropagation()} className="rounded border-border" />
                  </td>
                  <td className="px-5 py-3 font-mono text-sm font-medium text-foreground">{r.code}</td>
                  <td className="px-5 py-3 text-sm text-foreground">{r.name}</td>
                  <td className="px-5 py-3 text-sm text-foreground">{r.centroName}</td>
                  <td className="px-5 py-3"><SenalBar pct={buildFichaDispositivo(r).senalPct} /></td>
                  <td className="px-5 py-3 font-mono text-sm text-muted tabular-nums">{r.potenciaKw === null ? '—' : `${formatNumber(r.potenciaKw, 1)} kW`}</td>
                  <td className="px-5 py-3 font-mono text-sm text-muted tabular-nums">{formatDateTime(r.ultimaLectura)}</td>
                  <td className="px-5 py-3"><StatusBadge estado={r.estado} /></td>
                  <td className="px-5 py-3 text-muted">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-card-border px-5 py-2.5">
          <span className="text-xs text-muted">{remarcadoresFiltrados.length} de {remarcadores.length} equipos</span>
          <span className="text-xs text-muted">Haz clic en una fila para ver el detalle</span>
        </div>
        </>
        )}
      </div>
      </QueryStateView>
    </div>
  );
}

function StatCard({ label, value, sub, positive, negative }: Readonly<{ label: string; value: string; sub: string; positive?: boolean; negative?: boolean }>) {
  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="text-xs text-card-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-card-fg tabular-nums">{value}</p>
      <p className={`mt-1 text-[11px] ${negative ? 'text-danger' : positive ? 'text-success' : 'text-muted'}`}>{sub}</p>
    </div>
  );
}

function Th({ children, accent }: Readonly<{ children?: React.ReactNode; accent?: boolean }>) {
  return <th className={`px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider ${accent ? 'text-accent' : 'text-muted'}`}>{children}</th>;
}

function SenalBar({ pct }: Readonly<{ pct: number }>) {
  const color = pct >= 60 ? 'bg-success' : pct > 0 ? 'bg-warning' : 'bg-danger';
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-raised">
        <span className={`block h-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-xs text-muted tabular-nums">{pct}%</span>
    </span>
  );
}
