import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';

interface ReporteProgramado {
  id: string;
  nombre: string;
  alcance: string;
  frecuencia: string;
  formato: string;
  activo: boolean;
}

const PROGRAMADOS: ReporteProgramado[] = [
  { id: 'rp1', nombre: 'Consumo y margen mensual', alcance: 'Todos los centros', frecuencia: 'Mensual · día 1', formato: 'PDF', activo: true },
  { id: 'rp2', nombre: 'Detalle por centro', alcance: 'Alto Peñalolén', frecuencia: 'Mensual · día 3', formato: 'Excel', activo: true },
  { id: 'rp3', nombre: 'Salud de la flota', alcance: 'Remarcadores', frecuencia: 'Semanal · lunes', formato: 'PDF', activo: true },
  { id: 'rp4', nombre: 'Picos de demanda', alcance: 'Quilicura', frecuencia: 'Diario · 08:00', formato: 'Excel', activo: false },
];

const GENERACION_MS = 900;

const FORMATO_CLS: Record<string, string> = {
  PDF: 'bg-danger-bg text-danger',
  Excel: 'bg-success-bg text-success',
};

const SECONDARY_BUTTON = 'flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised';
const FIELD_CLASS = 'h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none';

export function ReportesPage() {
  const [reportes, setReportes] = useState(PROGRAMADOS);
  const [generando, setGenerando] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const generados = useAppStore((s) => s.reportesGenerados);
  const agregarReporteGenerado = useAppStore((s) => s.agregarReporteGenerado);
  const showToast = useToastStore((s) => s.showToast);

  const toggleReporte = (reporte: ReporteProgramado) => {
    setReportes((prev) => prev.map((r) => (r.id === reporte.id ? { ...r, activo: !r.activo } : r)));
    showToast(reporte.activo ? 'Envío pausado' : 'Envío programado');
  };

  const generarAhora = (reporte: ReporteProgramado) => {
    setGenerando((prev) => new Set(prev).add(reporte.id));
    setTimeout(() => {
      agregarReporteGenerado({ nombre: reporte.nombre, formato: reporte.formato });
      setGenerando((prev) => {
        const next = new Set(prev);
        next.delete(reporte.id);
        return next;
      });
      showToast(`«${reporte.nombre}» generado`);
    }, GENERACION_MS);
  };

  const crearReporte = (reporte: Omit<ReporteProgramado, 'id' | 'activo'>) => {
    setReportes((prev) => [...prev, { ...reporte, id: crypto.randomUUID(), activo: true }]);
    setIsCreating(false);
    showToast('Reporte programado');
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Reportes</h1>
          <p className="text-xs text-muted">Exporta datos y programa envíos automáticos</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setIsCreating(true)} className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">
          + Nuevo reporte
        </button>
        <button type="button" onClick={() => showToast('Exportando la serie de consumo…')} className={SECONDARY_BUTTON}>
          ↓ Exportar consumo (Excel)
        </button>
        <button type="button" onClick={() => showToast('Exportando el detalle de márgenes…')} className={SECONDARY_BUTTON}>
          ↓ Exportar márgenes (PDF)
        </button>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-card-fg">Reportes programados</h2>
            <p className="text-xs text-card-muted">Se generan y envían automáticamente</p>
          </div>
          <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-500">Módulo Reportes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-card-border">
                <Th>Reporte</Th>
                <Th>Alcance</Th>
                <Th>Frecuencia</Th>
                <Th>Formato</Th>
                <Th>Programación</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {reportes.map((r) => (
                <tr key={r.id} className="hover:bg-surface">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{r.nombre}</td>
                  <td className="px-4 py-3 text-sm text-muted">{r.alcance}</td>
                  <td className="px-4 py-3 text-sm text-muted">{r.frecuencia}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${FORMATO_CLS[r.formato]}`}>{r.formato}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={r.activo}
                        aria-label={`Programar ${r.nombre}`}
                        onClick={() => toggleReporte(r)}
                        className={`relative h-5 w-9 rounded-full transition-colors ${r.activo ? 'bg-accent' : 'bg-raised'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${r.activo ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                      <span className="text-xs text-muted">{r.activo ? 'Programado' : 'Pausado'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" disabled={generando.has(r.id)} onClick={() => generarAhora(r)} className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-raised disabled:opacity-60">
                      {generando.has(r.id) ? 'Generando…' : 'Generar ahora'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        {generados.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-2 text-2xl text-muted">⏱</div>
            <p className="text-sm font-medium text-card-fg">Sin reportes generados hoy</p>
            <p className="mt-1 text-xs text-muted">También puedes generar cualquiera manualmente.</p>
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold text-card-fg">Generados en esta sesión</h2>
            <div className="flex flex-col gap-2">
              {generados.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{g.nombre}</p>
                    <p className="font-mono text-xs text-muted">{g.formato} · {g.hora}</p>
                  </div>
                  <button type="button" onClick={() => showToast(`Descargando ${g.nombre}`)} className={SECONDARY_BUTTON}>↓ Descargar</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <NuevoReporteModal open={isCreating} onClose={() => setIsCreating(false)} onCreate={crearReporte} />
    </div>
  );
}

function NuevoReporteModal({ open, onClose, onCreate }: Readonly<{
  open: boolean;
  onClose: () => void;
  onCreate: (reporte: Omit<ReporteProgramado, 'id' | 'activo'>) => void;
}>) {
  const buildingsQuery = useBuildingsQuery();

  const crear = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCreate({
      nombre: String(form.get('nombre')).trim() || 'Reporte sin nombre',
      alcance: String(form.get('alcance')),
      frecuencia: String(form.get('frecuencia')),
      formato: String(form.get('formato')),
    });
    event.currentTarget.reset();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo reporte">
      <p className="mb-4 text-sm text-muted">Se guardará como reporte programado.</p>
      <form onSubmit={crear} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nombre
          <input name="nombre" placeholder="Consumo semanal por centro" className={FIELD_CLASS} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Alcance
          <select name="alcance" className={FIELD_CLASS}>
            <option>Todos los centros</option>
            {(buildingsQuery.data ?? []).map((building) => <option key={building.id}>{building.name}</option>)}
            <option>Remarcadores</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Frecuencia
          <select name="frecuencia" className={FIELD_CLASS}>
            {['Diario · 08:00', 'Semanal · lunes', 'Mensual · día 1'].map((frecuencia) => <option key={frecuencia}>{frecuencia}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Formato
          <select name="formato" className={FIELD_CLASS}>
            <option>PDF</option>
            <option>Excel</option>
          </select>
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-muted hover:text-foreground">Cancelar</button>
          <button type="submit" className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">+ Crear reporte</button>
        </div>
      </form>
    </Modal>
  );
}

function Th({ children }: Readonly<{ children?: React.ReactNode }>) {
  return <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">{children}</th>;
}
