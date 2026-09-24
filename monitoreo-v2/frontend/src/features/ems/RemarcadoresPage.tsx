import { useState } from 'react';
import { useNavigate } from 'react-router';
import { REMARCADORES, type Remarcador } from './mock-data';
import { StatusBadge } from './StatusBadge';

type Filtro = 'todos' | 'conectados' | 'sin_senal' | 'caidos' | 'mantencion';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'conectados', label: 'Conectados' },
  { key: 'sin_senal', label: 'Sin señal' },
  { key: 'caidos', label: 'Caídos' },
  { key: 'mantencion', label: 'En mantención' },
];

function filtrar(remarcadores: Remarcador[], filtro: Filtro, busqueda: string): Remarcador[] {
  let resultado = remarcadores;
  if (filtro === 'conectados') resultado = resultado.filter((r) => r.estado === 'conectado');
  if (filtro === 'sin_senal') resultado = resultado.filter((r) => r.estado === 'sin_senal');
  if (filtro === 'caidos') resultado = resultado.filter((r) => r.estado === 'caido');
  if (filtro === 'mantencion') resultado = [];
  if (busqueda) {
    const q = busqueda.toLowerCase();
    resultado = resultado.filter((r) => r.code.toLowerCase().includes(q) || r.centroName.toLowerCase().includes(q) || r.modelo.toLowerCase().includes(q));
  }
  return resultado;
}

export function RemarcadoresPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const conectados = REMARCADORES.filter((r) => r.estado === 'conectado').length;
  const sinSenal = REMARCADORES.filter((r) => r.estado === 'sin_senal').length;
  const caidos = REMARCADORES.filter((r) => r.estado === 'caido').length;
  const desconectado = REMARCADORES.find((r) => r.estado === 'caido');

  const remarcadoresFiltrados = filtrar(REMARCADORES, filtro, busqueda);

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
        <p className="text-xs text-muted">{REMARCADORES.length} dispositivos en la flota</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Dispositivos" value={String(REMARCADORES.length)} sub={`${new Set(REMARCADORES.map((r) => r.centroId)).size} centros cubiertos`} />
        <StatCard label="Conectados" value={String(conectados)} sub={`↑ ${((conectados / REMARCADORES.length) * 100).toFixed(1)}% de la flota`} positive />
        <StatCard label="Sin señal" value={String(sinSenal)} sub="Señal bajo 25%" />
        <StatCard label="Caídos" value={String(caidos)} sub="↓ Alerta generada" negative />
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
        <button type="button" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
          ⚡ Forzar lectura
        </button>
      </div>

      {desconectado && (
        <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger-bg px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-danger">⊘</span>
            <div>
              <p className="text-sm font-medium text-foreground">{desconectado.code} sin reportar desde las {desconectado.ultimaLectura}</p>
              <p className="text-xs text-muted">Se generó automáticamente una alerta de desconexión para {desconectado.centroName}.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="text-xs font-medium text-foreground hover:underline" onClick={() => navigate('/alertas')}>
              Ver alertas
            </button>
            <button type="button" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised">
              Diagnosticar
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
                <Th>Centro</Th>
                <Th>Modelo</Th>
                <Th>Señal</Th>
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
                  <td className="px-5 py-3 text-sm text-foreground">{r.centroName}</td>
                  <td className="px-5 py-3 font-mono text-sm text-muted">{r.modelo}</td>
                  <td className="px-5 py-3">
                    <SignalBars signal={r.signal} />
                  </td>
                  <td className="px-5 py-3 font-mono text-sm text-muted tabular-nums">{r.ultimaLectura}</td>
                  <td className="px-5 py-3"><StatusBadge estado={r.estado} /></td>
                  <td className="px-5 py-3 text-muted">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SignalBars({ signal }: Readonly<{ signal: number }>) {
  const bars = signal >= 75 ? 4 : signal >= 50 ? 3 : signal >= 25 ? 2 : signal > 0 ? 1 : 0;
  const color = bars >= 3 ? 'var(--color-success)' : bars >= 2 ? 'var(--color-warning)' : 'var(--color-danger)';
  return (
    <span className="inline-flex items-end gap-0.5">
      {[1, 2, 3, 4].map((b) => (
        <span key={b} className="w-1 rounded-sm" style={{ height: `${b * 3 + 2}px`, backgroundColor: b <= bars ? color : 'var(--color-border)' }} />
      ))}
      <span className="ml-1 font-mono text-xs text-muted tabular-nums">{signal}%</span>
    </span>
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
