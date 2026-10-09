import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import type { AlertaSeveridad, Regla } from './alerts';
import { useEmsAlertas } from './useEmsFleet';
import { CANALES_LABELS, TIPOS_REGLA_LABELS, TODOS_LOS_CENTROS, useReglas } from './useReglas';

type Filtro = 'todas' | 'criticas' | 'advertencias' | 'informativas' | 'resueltas';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'criticas', label: 'Críticas' },
  { key: 'advertencias', label: 'Advertencias' },
  { key: 'informativas', label: 'Informativas' },
  { key: 'resueltas', label: 'Resueltas' },
];

const SEVERIDAD_BY_FILTRO: Partial<Record<Filtro, AlertaSeveridad>> = {
  criticas: 'critica',
  advertencias: 'advertencia',
  informativas: 'informativa',
};

const EMPTY_TEXT: Record<Filtro, string> = {
  todas: 'No hay alertas activas ahora mismo.',
  criticas: 'No hay alertas de este tipo ahora mismo.',
  advertencias: 'No hay alertas de este tipo ahora mismo.',
  informativas: 'No hay alertas de este tipo ahora mismo.',
  resueltas: 'Todavía no has resuelto ninguna alerta en esta sesión.',
};

const SECONDARY_BUTTON = 'flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised';

const SEVERITY_ICON: Record<AlertaSeveridad, { icon: string; cls: string }> = {
  critica: { icon: '⊘', cls: 'text-danger' },
  advertencia: { icon: '⚠', cls: 'text-warning' },
  informativa: { icon: 'ℹ', cls: 'text-info' },
};

export function AlertasPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const { reglas, alternar, eliminar } = useReglas();
  const reabrirAlerta = useAppStore((s) => s.reabrirAlerta);
  const [isConfirmingTodas, setIsConfirmingTodas] = useState(false);
  const [isCreatingRegla, setIsCreatingRegla] = useState(false);
  const [reglaPorEliminar, setReglaPorEliminar] = useState<Regla | null>(null);
  const { phase, error, alertas, activas, criticas } = useEmsAlertas();
  const resolverAlertas = useAppStore((s) => s.resolverAlertas);
  const showToast = useToastStore((s) => s.showToast);

  const resueltasHoy = alertas.length - activas.length;
  const reglasActivas = reglas.filter((r) => r.activa).length;
  const severidadFiltro = SEVERIDAD_BY_FILTRO[filtro];
  const alertasFiltradas = filtro === 'resueltas'
    ? alertas.filter((a) => a.isResuelta)
    : activas.filter((a) => !severidadFiltro || a.severidad === severidadFiltro);

  const resolver = (id: string) => {
    resolverAlertas([id]);
    showToast('Alerta resuelta');
  };

  const resolverTodas = () => {
    setIsConfirmingTodas(false);
    resolverAlertas(activas.map((a) => a.id));
    showToast('Alertas resueltas');
  };
  const alternarRegla = async (regla: Regla) => {
    if (await alternar(regla)) showToast(regla.activa ? 'Regla pausada' : 'Regla activada');
  };
  const confirmarEliminarRegla = async () => {
    if (!reglaPorEliminar) return;
    const regla = reglaPorEliminar;
    setReglaPorEliminar(null);
    if (await eliminar(regla)) showToast('Regla eliminada');
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Alertas</h1>
        <p className="text-xs text-muted">Reglas de peak, desconexión y umbral de consumo</p>
      </div>

      <QueryStateView phase={phase} error={error}>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Alertas activas" value={String(activas.length)} sub="Últimas 72 horas" />
            <StatCard label="Críticas" value={String(criticas)} sub="↓ Requieren acción" negative />
            <StatCard label="Resueltas hoy" value={String(resueltasHoy)} sub="↑ Cerradas por el equipo" positive />
            <StatCard label="Reglas activas" value={`${reglasActivas}`} unit={`/${reglas.length}`} sub="Configuradas" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
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
            <div className="flex items-center gap-2">
              {activas.length > 0 && (
                <button type="button" onClick={() => setIsConfirmingTodas(true)} className={SECONDARY_BUTTON}>
                  ✓ Resolver todas
                </button>
              )}
              <button type="button" onClick={() => setIsCreatingRegla(true)} className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">
                + Nueva regla
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {alertasFiltradas.map((a) => {
              const sev = SEVERITY_ICON[a.severidad];
              return (
                <div key={a.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-card-border bg-card px-4 py-3 ${a.isResuelta ? 'opacity-55' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${sev.cls}`}>{sev.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {a.titulo}
                        {a.isResuelta && <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted">✓ Resuelta</span>}
                      </p>
                      <p className="text-xs text-muted">{a.detalle} · automática</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => navigate(`/remarcadores/${a.remarcadorId}`)} className="text-xs font-medium text-foreground hover:underline">
                      Ver equipo
                    </button>
                    {a.isResuelta ? (
                      <button type="button" onClick={() => reabrirAlerta(a.id)} className="px-2 py-1.5 text-xs font-medium text-muted hover:text-foreground">
                        Reabrir
                      </button>
                    ) : (
                      <button type="button" onClick={() => resolver(a.id)} className={SECONDARY_BUTTON}>
                        ✓ Resolver
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {alertasFiltradas.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-card-border bg-card px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">Sin alertas en este filtro</p>
                <p className="text-xs text-muted">{EMPTY_TEXT[filtro]}</p>
                {filtro !== 'todas' && (
                  <button type="button" onClick={() => setFiltro('todas')} className={`mt-2 ${SECONDARY_BUTTON}`}>Ver todas</button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-card-fg">Reglas de alerta</h2>
              <span className="text-xs text-muted">Desactiva una regla para dejar de recibir sus avisos</span>
            </div>
            <div className="overflow-x-auto">
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
                          role="switch"
                          aria-checked={r.activa}
                          aria-label={`Activar ${r.nombre}`}
                          onClick={() => void alternarRegla(r)}
                          className={`relative h-5 w-9 rounded-full transition-colors ${r.activa ? 'bg-accent' : 'bg-raised'}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${r.activa ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                        <span className="text-xs text-muted">{r.activa ? 'Activa' : 'Pausada'}</span>
                        <button type="button" onClick={() => setReglaPorEliminar(r)} aria-label={`Eliminar ${r.nombre}`} className="ml-2 text-muted hover:text-danger">×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </QueryStateView>

      <ConfirmDialog
        open={isConfirmingTodas}
        onClose={() => setIsConfirmingTodas(false)}
        onConfirm={resolverTodas}
        title="Resolver todas las alertas"
        message={`Se cerrarán ${activas.length} alertas activas. Las de desconexión volverán a abrirse si el equipo sigue caído.`}
        confirmLabel="Resolver todas"
        confirmVariant="primary"
      />
      <ConfirmDialog
        open={reglaPorEliminar !== null}
        onClose={() => setReglaPorEliminar(null)}
        onConfirm={() => void confirmarEliminarRegla()}
        title="Eliminar regla"
        message={`«${reglaPorEliminar?.nombre ?? ''}» dejará de generar alertas. No afecta a las alertas ya emitidas.`}
      />
      <NuevaReglaModal open={isCreatingRegla} onClose={() => setIsCreatingRegla(false)} />
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
