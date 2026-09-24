import { useState } from 'react';
import { useNavigate } from 'react-router';

interface Alerta {
  id: string;
  tipo: 'desconexion' | 'pico' | 'consumo' | 'margen' | 'senal';
  severidad: 'critica' | 'advertencia' | 'informativa';
  titulo: string;
  detalle: string;
  centroId?: string;
  remarcadorId?: string;
  timestamp: string;
  automatica: boolean;
  resuelta: boolean;
}

interface Regla {
  id: string;
  nombre: string;
  tipo: string;
  aplicaA: string;
  notifica: string;
  activa: boolean;
}

const ALERTAS: Alerta[] = [
  { id: 'a1', tipo: 'desconexion', severidad: 'critica', titulo: 'Remarcador MTR-03310 sin conexión', detalle: 'Sin lecturas desde las 09:33:02 en Bodega San Bernardo. · Hoy 15:42 · automática', remarcadorId: 'r7', timestamp: 'Hoy 15:42', automatica: true, resuelta: false },
  { id: 'a2', tipo: 'pico', severidad: 'advertencia', titulo: 'Pico de demanda sobre el umbral', detalle: 'Planta Quilicura superó 1.240 kW a las 18:15 (umbral 1.150 kW). · Hoy 18:17', centroId: 'c3', timestamp: 'Hoy 18:17', automatica: false, resuelta: false },
  { id: 'a3', tipo: 'consumo', severidad: 'informativa', titulo: 'Consumo 12% sobre el mes anterior', detalle: 'Centro Costanera acumula 184,2 MWh contra 164,4 MWh en agosto. · Ayer 09:04', centroId: 'c1', timestamp: 'Ayer 09:04', automatica: false, resuelta: false },
  { id: 'a4', tipo: 'margen', severidad: 'critica', titulo: 'Margen bajo el mínimo contractual', detalle: 'Bodega San Bernardo cerró el periodo en 7,4% (mínimo definido: 10%). · 14 sep 08:30', centroId: 'c5', timestamp: '14 sep 08:30', automatica: false, resuelta: false },
  { id: 'a5', tipo: 'senal', severidad: 'advertencia', titulo: 'Señal degradada en MTR-02205', detalle: 'Señal al 21% en Planta Quilicura. Última lectura 12:04:11. · Hoy 15:10 · automática', remarcadorId: 'r5', timestamp: 'Hoy 15:10', automatica: true, resuelta: false },
];

const REGLAS: Regla[] = [
  { id: 'r1', nombre: 'Pico sobre 1.150 kW', tipo: 'Pico de demanda', aplicaA: 'Planta Quilicura', notifica: 'Correo + app', activa: true },
  { id: 'r2', nombre: 'Desconexión > 30 min', tipo: 'Desconexión', aplicaA: 'Todos los centros', notifica: 'App', activa: true },
  { id: 'r3', nombre: 'Margen bajo 10%', tipo: 'Margen contractual', aplicaA: 'Todos los centros', notifica: 'Correo + app', activa: true },
  { id: 'r4', nombre: 'Consumo nocturno anómalo', tipo: 'Umbral consumo', aplicaA: 'Centro Costanera', notifica: 'App', activa: false },
];

type Filtro = 'todas' | 'criticas' | 'advertencias' | 'informativas' | 'resueltas';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'criticas', label: 'Críticas' },
  { key: 'advertencias', label: 'Advertencias' },
  { key: 'informativas', label: 'Informativas' },
  { key: 'resueltas', label: 'Resueltas' },
];

const SEVERITY_ICON: Record<string, { icon: string; cls: string }> = {
  critica: { icon: '⊘', cls: 'text-danger' },
  advertencia: { icon: '⚠', cls: 'text-warning' },
  informativa: { icon: 'ℹ', cls: 'text-info' },
};

export function AlertasPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [alertas, setAlertas] = useState(ALERTAS);
  const [reglas, setReglas] = useState(REGLAS);

  const abiertas = alertas.filter((a) => !a.resuelta).length;
  const criticas = alertas.filter((a) => a.severidad === 'critica' && !a.resuelta).length;
  const resueltasHoy = alertas.filter((a) => a.resuelta).length;
  const reglasActivas = reglas.filter((r) => r.activa).length;

  const alertasFiltradas = alertas.filter((a) => {
    if (filtro === 'criticas') return a.severidad === 'critica' && !a.resuelta;
    if (filtro === 'advertencias') return a.severidad === 'advertencia' && !a.resuelta;
    if (filtro === 'informativas') return a.severidad === 'informativa' && !a.resuelta;
    if (filtro === 'resueltas') return a.resuelta;
    return !a.resuelta;
  });

  const resolver = (id: string) => {
    setAlertas((prev) => prev.map((a) => a.id === id ? { ...a, resuelta: true } : a));
  };

  const resolverTodas = () => {
    setAlertas((prev) => prev.map((a) => ({ ...a, resuelta: true })));
  };

  const toggleRegla = (id: string) => {
    setReglas((prev) => prev.map((r) => r.id === id ? { ...r, activa: !r.activa } : r));
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Alertas</h1>
        <p className="text-xs text-muted">Reglas de peak, desconexión y umbral de consumo</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Alertas activas" value={String(abiertas)} sub="Últimas 72 horas" />
        <StatCard label="Críticas" value={String(criticas)} sub="↓ Requieren acción" negative />
        <StatCard label="Resueltas hoy" value={String(resueltasHoy)} sub="↑ Cerradas por el equipo" positive />
        <StatCard label="Reglas activas" value={`${reglasActivas}`} unit={`/${reglas.length}`} sub="Configuradas" />
      </div>

      <div className="flex items-center justify-between gap-3">
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
        <div className="flex items-center gap-2">
          <button type="button" onClick={resolverTodas} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
            ✓ Resolver todas
          </button>
          <button type="button" className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">
            + Nueva regla
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {alertasFiltradas.map((a) => {
          const sev = SEVERITY_ICON[a.severidad];
          const navTarget = a.remarcadorId ? `/remarcadores/${a.remarcadorId}` : a.centroId ? `/centros/${a.centroId}` : undefined;
          const navLabel = a.remarcadorId ? 'Ver equipo' : 'Ver centro';
          return (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-card-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`text-lg ${sev.cls}`}>{sev.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{a.titulo}</p>
                  <p className="text-xs text-muted">{a.detalle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {navTarget && (
                  <button type="button" onClick={() => navigate(navTarget)} className="text-xs font-medium text-foreground hover:underline">
                    {navLabel}
                  </button>
                )}
                <button type="button" onClick={() => resolver(a.id)} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised">
                  ✓ Resolver
                </button>
              </div>
            </div>
          );
        })}
        {alertasFiltradas.length === 0 && (
          <div className="rounded-lg border border-card-border bg-card px-4 py-8 text-center text-xs text-muted">
            Sin alertas en esta categoría
          </div>
        )}
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-card-fg">Reglas de alerta</h2>
          <span className="text-xs text-muted">Desactiva una regla para dejar de recibir sus avisos</span>
        </div>
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-card-border">
              <Th>Regla</Th>
              <Th>Tipo</Th>
              <Th>Aplica a</Th>
              <Th>Notifica</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {reglas.map((r) => (
              <tr key={r.id} className="hover:bg-surface">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{r.nombre}</td>
                <td className="px-4 py-3 text-sm text-muted">{r.tipo}</td>
                <td className="px-4 py-3 text-sm text-muted">{r.aplicaA}</td>
                <td className="px-4 py-3 text-sm text-muted">{r.notifica}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRegla(r.id)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${r.activa ? 'bg-accent' : 'bg-raised'}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${r.activa ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                    <span className="text-xs text-muted">{r.activa ? 'Activa' : 'Pausado'}</span>
                    <button type="button" className="ml-2 text-muted hover:text-danger">×</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, sub, positive, negative }: Readonly<{
  label: string; value: string; unit?: string; sub: string; positive?: boolean; negative?: boolean;
}>) {
  const subColor = negative ? 'text-danger' : positive ? 'text-success' : 'text-muted';
  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="text-xs text-card-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-card-fg tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-card-muted">{unit}</span>}
      </p>
      <p className={`mt-1 text-[11px] ${subColor}`}>{sub}</p>
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">{children}</th>;
}
