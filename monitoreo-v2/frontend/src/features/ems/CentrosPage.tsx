import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Modal } from '../../components/ui/Modal';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import type { Centro, CentroEstado } from './fleet';
import { formatNumber } from './format';
import { StatusBadge } from './StatusBadge';
import { BulkBar, EmptyFilterState, onRowKeyDown, SearchInput, SelectAllCheckbox, SortableTh, sortRows, useSelection, useSort } from './table';
import { useEmsFleet } from './useEmsFleet';

type Filtro = 'todos' | CentroEstado;
type SortKey = 'nombre' | 'direccion' | 'consumo' | 'remarcadores';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'operativo', label: 'Operativos' },
  { key: 'advertencia', label: 'Con advertencia' },
  { key: 'alarma', label: 'Con incidencia' },
];

const SORT_GETTERS: Record<SortKey, (centro: Centro) => string | number> = {
  nombre: (c) => c.name,
  direccion: (c) => c.address ?? '',
  consumo: (c) => c.consumoMesKwh,
  remarcadores: (c) => c.remarcadores,
};

function filtrar(centros: Centro[], filtro: Filtro, busqueda: string): Centro[] {
  const q = busqueda.toLowerCase();
  return centros.filter((c) =>
    (filtro === 'todos' || c.estado === filtro)
    && (!q || [c.name, c.code, c.address ?? ''].some((text) => text.toLowerCase().includes(q))));
}

const SECONDARY_BUTTON = 'flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised';

export function CentrosPage() {
  const navigate = useNavigate();
  const { phase, error, refetch, centros } = useEmsFleet();
  const showToast = useToastStore((s) => s.showToast);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const selection = useSelection();
  const { sort, toggleSort } = useSort<SortKey>({ key: 'consumo', direction: 'desc' });
  const [isCreating, setIsCreating] = useState(false);

  const centrosFiltrados = sortRows(filtrar(centros, filtro, busqueda), sort, SORT_GETTERS);
  const idsFiltrados = centrosFiltrados.map((c) => c.id);
  const seleccionadosVisibles = idsFiltrados.filter((id) => selection.selected.has(id)).length;

  const buscar = (value: string) => {
    setBusqueda(value);
    selection.clear();
  };
  const quitarFiltros = () => {
    setBusqueda('');
    setFiltro('todos');
  };
  const agregarReporteGenerado = useAppStore((s) => s.agregarReporteGenerado);
  const generarReporte = () => {
    agregarReporteGenerado({ nombre: `Reporte de ${selection.selected.size} centros seleccionados`, formato: 'PDF' });
    selection.clear();
    navigate('/reportes');
    showToast('Reporte generado');
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:overflow-hidden md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Centros</h1>
          <p className="text-xs text-muted">{centros.length} centros activos</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={busqueda} onChange={buscar} placeholder="Buscar centro, código o dirección" />
          <div className="flex gap-1">
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
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => showToast('Exportando la cartera de centros…')} className={SECONDARY_BUTTON}>
            ↓ Exportar
          </button>
          <button type="button" onClick={() => setIsCreating(true)} className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">
            + Nuevo centro
          </button>
        </div>
      </div>

      <BulkBar count={selection.selected.size} noun="centro" onClear={selection.clear}>
        <button type="button" onClick={() => showToast('Exportando la selección…')} className={SECONDARY_BUTTON}>↓ Exportar selección</button>
        <button type="button" onClick={generarReporte} className={SECONDARY_BUTTON}>Generar reporte</button>
      </BulkBar>

      <QueryStateView phase={phase} error={error} refetch={refetch}>
      <div className="min-h-[20rem] flex-1 overflow-hidden rounded-xl border border-card-border bg-card md:min-h-0">
        {centrosFiltrados.length === 0 ? (
          <EmptyFilterState title="Sin centros que coincidan" text="Ajusta la búsqueda o el filtro de estado para volver a ver la cartera." onReset={quitarFiltros} />
        ) : (
        <div className="flex h-full flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="w-10 px-4 py-2.5">
                    <SelectAllCheckbox selectedCount={seleccionadosVisibles} totalCount={idsFiltrados.length} onToggle={() => selection.toggleAll(idsFiltrados)} />
                  </th>
                  <SortableTh label="Centro" sortKey="nombre" sort={sort} onToggle={toggleSort} />
                  <SortableTh label="Dirección" sortKey="direccion" sort={sort} onToggle={toggleSort} />
                  <SortableTh label="Consumo mes" sortKey="consumo" sort={sort} onToggle={toggleSort} />
                  <SortableTh label="Remarcadores" sortKey="remarcadores" sort={sort} onToggle={toggleSort} />
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {centrosFiltrados.map((c) => {
                  const abrir = () => navigate(`/centros/${c.id}`);
                  return (
                    <tr key={c.id} tabIndex={0} className={`cursor-pointer hover:bg-surface ${selection.selected.has(c.id) ? 'bg-accent/10' : ''}`} onClick={abrir} onKeyDown={onRowKeyDown(abrir)}>
                      <td className="w-10 px-4 py-3">
                        <input type="checkbox" aria-label={`Seleccionar ${c.name}`} checked={selection.selected.has(c.id)} onChange={() => selection.toggle(c.id)} onClick={(e) => e.stopPropagation()} className="rounded border-border" />
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="font-mono text-xs text-muted">{c.code}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-foreground">{c.address ?? '—'}</td>
                      <td className="px-5 py-3 font-mono text-sm text-foreground tabular-nums">{formatNumber(c.consumoMesKwh / 1000, 1)} <span className="text-xs text-muted">MWh</span></td>
                      <td className="px-5 py-3 font-mono text-sm text-foreground tabular-nums">{c.remarcadores}</td>
                      <td className="px-5 py-3"><StatusBadge estado={c.estado} /></td>
                      <td className="px-5 py-3 text-muted">›</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-card-border px-5 py-2.5">
            <span className="text-xs text-muted">{centrosFiltrados.length} de {centros.length} centros</span>
            <span className="text-xs text-muted">Haz clic en una fila para ver el detalle</span>
          </div>
        </div>
        )}
      </div>
      </QueryStateView>

      <NuevoCentroModal open={isCreating} onClose={() => setIsCreating(false)} />
    </div>
  );
}

function NuevoCentroModal({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const agregarCentro = useAppStore((s) => s.agregarCentro);
  const showToast = useToastStore((s) => s.showToast);

  const crear = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    agregarCentro({
      name: String(form.get('nombre')).trim() || 'Centro sin nombre',
      address: String(form.get('direccion')).trim() || '—',
    });
    event.currentTarget.reset();
    onClose();
    showToast('Centro creado · pendiente de instalar remarcador');
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo centro">
      <p className="mb-4 text-sm text-muted">Alta de un sitio donde vendes energía.</p>
      <form onSubmit={crear} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nombre del centro
          <input name="nombre" placeholder="Centro Las Condes" className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Dirección o comuna
          <input name="direccion" placeholder="Las Condes" className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none" />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-muted hover:text-foreground">Cancelar</button>
          <button type="submit" className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">+ Crear centro</button>
        </div>
      </form>
    </Modal>
  );
}
