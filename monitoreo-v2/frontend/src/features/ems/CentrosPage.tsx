import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CENTROS, type Centro } from './mock-data';
import { StatusBadge } from './StatusBadge';

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

type Filtro = 'todos' | 'operativos' | 'advertencia' | 'incidencia';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'operativos', label: 'Operativos' },
  { key: 'advertencia', label: 'Con advertencia' },
  { key: 'incidencia', label: 'Con incidencia' },
];

function filtrar(centros: Centro[], filtro: Filtro, busqueda: string): Centro[] {
  let resultado = centros;
  if (filtro === 'operativos') resultado = resultado.filter((c) => c.estado === 'operativo');
  if (filtro === 'advertencia') resultado = resultado.filter((c) => c.estado === 'advertencia');
  if (filtro === 'incidencia') resultado = resultado.filter((c) => c.estado === 'alarma');
  if (busqueda) {
    const q = busqueda.toLowerCase();
    resultado = resultado.filter((c) => c.name.toLowerCase().includes(q) || c.cliente.toLowerCase().includes(q) || c.comuna.toLowerCase().includes(q));
  }
  return resultado;
}

export function CentrosPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const centrosFiltrados = filtrar(CENTROS, filtro, busqueda);

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (seleccionados.size === centrosFiltrados.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(centrosFiltrados.map((c) => c.id)));
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Centros</h1>
          <p className="text-xs text-muted">{CENTROS.length} centros activos</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⊙</span>
            <input
              type="text"
              placeholder="Buscar centro, cliente o c..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
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
          <button type="button" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
            ↓ Exportar
          </button>
          <button type="button" className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">
            + Nuevo centro
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-card-border bg-card">
        <div className="flex h-full flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="w-10 px-4 py-2.5">
                    <input type="checkbox" checked={seleccionados.size === centrosFiltrados.length && centrosFiltrados.length > 0} onChange={toggleTodos} className="rounded border-border" />
                  </th>
                  <Th>Centro</Th>
                  <Th>Comuna</Th>
                  <Th accent>Consumo mes</Th>
                  <Th>Margen</Th>
                  <Th>Estado</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {centrosFiltrados.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-surface" onClick={() => navigate(`/centros/${c.id}`)}>
                    <td className="w-10 px-4 py-3">
                      <input type="checkbox" checked={seleccionados.has(c.id)} onChange={(e) => { e.stopPropagation(); toggleSeleccion(c.id); }} onClick={(e) => e.stopPropagation()} className="rounded border-border" />
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted">{c.cliente}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">{c.comuna}</td>
                    <td className="px-5 py-3 font-mono text-sm text-foreground tabular-nums">{fmt(c.consumoMes, 1)} <span className="text-xs text-muted">MWh</span></td>
                    <td className="px-5 py-3 font-mono text-sm text-foreground tabular-nums">${fmt(c.margen, 1)}M <span className="text-xs text-muted">({fmt(c.margenPct, 1)}%)</span></td>
                    <td className="px-5 py-3"><StatusBadge estado={c.estado} /></td>
                    <td className="px-5 py-3 text-muted">›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-card-border px-5 py-2.5">
            <span className="text-xs text-muted">{centrosFiltrados.length} de {CENTROS.length} centros</span>
            <span className="text-xs text-muted">Haz clic en una fila para ver el detalle</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children, accent }: Readonly<{ children?: React.ReactNode; accent?: boolean }>) {
  return (
    <th className={`px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider ${accent ? 'text-accent' : 'text-muted'}`}>
      {children}
    </th>
  );
}
