import { useState } from 'react';
import { useNavigate } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import type { Remarcador } from './fleet';
import { formatDateTime, formatNumber } from './format';
import { StatusBadge } from './StatusBadge';
import { useEmsFleet } from './useEmsFleet';

type Filtro = 'todos' | 'conectados' | 'sin_senal' | 'caidos';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'conectados', label: 'Conectados' },
  { key: 'sin_senal', label: 'Sin señal' },
  { key: 'caidos', label: 'Caídos' },
];

function filtrar(remarcadores: Remarcador[], filtro: Filtro, busqueda: string): Remarcador[] {
  let resultado = remarcadores;
  if (filtro === 'conectados') resultado = resultado.filter((r) => r.estado === 'conectado');
  if (filtro === 'sin_senal') resultado = resultado.filter((r) => r.estado === 'sin_senal');
  if (filtro === 'caidos') resultado = resultado.filter((r) => r.estado === 'caido');
  if (busqueda) {
    const q = busqueda.toLowerCase();
    resultado = resultado.filter((r) => [r.code, r.name, r.centroName].some((text) => text.toLowerCase().includes(q)));
  }
  return resultado;
}

export function RemarcadoresPage() {
  const navigate = useNavigate();
  const { phase, error, refetch, remarcadores } = useEmsFleet();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const conectados = remarcadores.filter((r) => r.estado === 'conectado').length;
  const sinSenal = remarcadores.filter((r) => r.estado === 'sin_senal').length;
  const caidos = remarcadores.filter((r) => r.estado === 'caido').length;
  const desconectado = remarcadores.find((r) => r.estado === 'caido');
  const pctConectados = remarcadores.length > 0 ? (conectados / remarcadores.length) * 100 : 0;

  const remarcadoresFiltrados = filtrar(remarcadores, filtro, busqueda);

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (seleccionados.size === remarcadoresFiltrados.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(remarcadoresFiltrados.map((r) => r.id)));
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
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

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⊙</span>
            <input
              type="text"
              placeholder="Buscar por ID, centro o n..."
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
      </div>

      {desconectado && (
        <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger-bg px-4 py-3">
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
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-xl border border-card-border bg-card flex flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-card-border">
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={seleccionados.size === remarcadoresFiltrados.length && remarcadoresFiltrados.length > 0} onChange={toggleTodos} className="rounded border-border" />
                </th>
                <Th accent>ID</Th>
                <Th>Nombre</Th>
                <Th>Centro</Th>
                <Th>Potencia</Th>
                <Th>Última lectura</Th>
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {remarcadoresFiltrados.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-surface" onClick={() => navigate(`/remarcadores/${r.id}`)}>
                  <td className="w-10 px-4 py-3">
                    <input type="checkbox" checked={seleccionados.has(r.id)} onChange={() => toggleSeleccion(r.id)} onClick={(e) => e.stopPropagation()} className="rounded border-border" />
                  </td>
                  <td className="px-5 py-3 font-mono text-sm font-medium text-foreground">{r.code}</td>
                  <td className="px-5 py-3 text-sm text-foreground">{r.name}</td>
                  <td className="px-5 py-3 text-sm text-foreground">{r.centroName}</td>
                  <td className="px-5 py-3 font-mono text-sm text-muted tabular-nums">{r.potenciaKw === null ? '—' : `${formatNumber(r.potenciaKw, 1)} kW`}</td>
                  <td className="px-5 py-3 font-mono text-sm text-muted tabular-nums">{formatDateTime(r.ultimaLectura)}</td>
                  <td className="px-5 py-3"><StatusBadge estado={r.estado} /></td>
                  <td className="px-5 py-3 text-muted">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
