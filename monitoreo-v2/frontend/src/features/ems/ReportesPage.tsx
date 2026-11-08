import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useAppStore, type ModuloId } from '../../store/useAppStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { useToastStore } from '../../store/useToastStore';
import { descargarArchivo, imprimirTabla } from './exportar';
import type { Centro, Remarcador } from './fleet';
import { formatNumber, formatPeriodo } from './format';
import { NavModuleIcon } from '../../components/layout/sidebar-icons';
import { PageAction } from './PageAction';
import { canEditSection } from './roles';
import { Switch } from './Switch';
import { useEmsFleet } from './useEmsFleet';
import { useEmsRole } from './useEmsRole';
import {
  FORMATOS_LABELS,
  FRECUENCIAS_LABELS,
  TIPOS_REPORTE_LABELS,
  useReportesProgramados,
  type NuevoReporteProgramado,
} from './useReportesProgramados';
import { TODOS_LOS_CENTROS } from './useReglas';

type Seccion = 'consumo' | 'margenes' | 'flota' | 'sostenibilidad';

const HORA_ENVIO = 8;
const SECCIONES: Record<Seccion, { label: string; modulo: ModuloId | null }> = {
  consumo: { label: 'Consumo y demanda', modulo: null },
  margenes: { label: 'Márgenes', modulo: 'margenes' },
  flota: { label: 'Salud de la flota', modulo: null },
  sostenibilidad: { label: 'Sostenibilidad', modulo: 'sostenibilidad' },
};
const PROXIMO_ENVIO: Record<string, (ahora: Date) => Date> = {
  'Diario · 08:00': (ahora) => {
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), HORA_ENVIO);
    return hoy > ahora ? hoy : new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1, HORA_ENVIO);
  },
  'Semanal · lunes': (ahora) => {
    const dias = (8 - ahora.getDay()) % 7 || 7;
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias, HORA_ENVIO);
  },
  'Mensual · día 1': (ahora) => new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1, HORA_ENVIO),
};
const FIELD_CLASS = 'h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none';

export function proximoEnvio(frecuencia: string, ahora: Date): Date | null {
  return PROXIMO_ENVIO[frecuencia]?.(ahora) ?? null;
}

export function reporteFilas(secciones: Seccion[], centros: Centro[], remarcadores: Remarcador[]): string[][] {
  const bloques: Record<Seccion, () => string[][]> = {
    consumo: () => [['Consumo y demanda'], ['Centro', 'kWh del mes', 'kWh/m²'], ...centros.map((c) => [c.name, formatNumber(c.consumoMesKwh), c.intensidadKwhM2 === null ? '—' : formatNumber(c.intensidadKwhM2, 1)])],
    margenes: () => [['Márgenes'], ['Centro', 'Venta', 'Compra', 'Margen', '%'], ...centros.flatMap((c) => (c.margen ? [[c.name, formatNumber(c.margen.precioVentaClp), formatNumber(c.margen.costoCompraClp), formatNumber(c.margen.margenClp), formatNumber(c.margen.margenPct, 1)]] : []))],
    flota: () => [['Salud de la flota'], ['Centro', 'Remarcadores', 'Conectados', 'Sin señal', 'Caídos'], ...centros.map((c) => {
      const propios = remarcadores.filter((r) => r.centroId === c.id);
      return [c.name, String(propios.length), ...(['conectado', 'sin_senal', 'caido'] as const).map((e) => String(propios.filter((r) => r.estado === e).length))];
    })],
    sostenibilidad: () => [['Sostenibilidad'], ['Centro', 'kWh del mes'], ...centros.map((c) => [c.name, formatNumber(c.consumoMesKwh)])],
  };
  return secciones.flatMap((seccion) => [...bloques[seccion](), []]);
}

export function filasCsv(filas: string[][]): string {
  return `\uFEFF${filas.map((fila) => fila.join(';')).join('\n')}`;
}

export function ReportesPage() {
  const { reportes, crear, alternar } = useReportesProgramados();
  const fleet = useEmsFleet();
  const canEdit = canEditSection(useEmsRole(), 'reportes');
  const modulosActivos = useAppStore((s) => s.modulosActivos);
  const generados = useAppStore((s) => s.reportesGenerados);
  const agregarReporteGenerado = useAppStore((s) => s.agregarReporteGenerado);
  const showToast = useToastStore((s) => s.showToast);
  const [isCreating, setIsCreating] = useState(false);
  const [tipo, setTipo] = useState(TIPOS_REPORTE_LABELS[0]);
  const [centroId, setCentroId] = useState('');
  const [formato, setFormato] = useState(FORMATOS_LABELS[0]);
  const [secciones, setSecciones] = useState<Seccion[]>(['consumo', 'margenes']);
  const ahora = new Date();
  const periodo = formatPeriodo(fleet.periodo);

  const generar = () => {
    const centros = centroId ? fleet.centros.filter((c) => c.id === centroId) : fleet.centros;
    const nombre = `${tipo} · ${periodo}`;
    const filas = reporteFilas(secciones, centros, fleet.remarcadores);
    if (formato === 'PDF') imprimirTabla(nombre, filas);
    else descargarArchivo(`${tipo.toLowerCase().replace(/\s+/g, '-')}-${fleet.periodo.toLocaleDateString('sv-SE').slice(0, 7)}.csv`, filasCsv(filas), 'text/csv;charset=utf-8');
    agregarReporteGenerado({ nombre, formato });
    showToast(`«${nombre}» generado`);
  };

  usePageTitle('Reportes', 'Add-ons / Reportes', canEdit ? <PageAction label="+ Programar reporte" onClick={() => setIsCreating(true)} /> : undefined);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
            <section className="rounded-xl bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-card-fg">Reportes programados · {reportes.length}</h2>
              <ul className="flex flex-col gap-2">
                {reportes.map((r) => {
                  const proximo = r.activo ? proximoEnvio(r.frecuencia, ahora) : null;
                  return (
                    <li key={r.id} className={`flex items-center gap-3 rounded-lg border border-card-border px-3 py-3 ${r.activo ? '' : 'opacity-60'}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-module-reportes-bg text-module-reportes-ink"><NavModuleIcon name="file" className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{r.nombre}</p>
                        <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                          <span className="rounded-md bg-module-reportes-bg px-1.5 py-0.5 font-medium text-module-reportes-ink">{r.frecuencia}</span>
                          <span className="rounded-md bg-raised px-1.5 py-0.5">{r.formato}</span>
                          → {r.alcance}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted">Próximo envío</p>
                        <p className="font-mono text-xs text-foreground">{proximo ? proximo.toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                      </div>
                      <Switch checked={r.activo} disabled={!canEdit} label={`Programar ${r.nombre}`} onChange={() => void alternar(r).then((ok) => ok && showToast(r.activo ? 'Envío pausado' : 'Envío programado'))} />
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-xl bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-card-fg">Generados recientemente</h2>
              {generados.length === 0 ? <p className="py-6 text-center text-xs text-muted">Aún no generas reportes en esta sesión. Usa «Generar ahora».</p> : (
                <ul className="divide-y divide-card-border">
                  {generados.map((g) => (
                    <li key={g.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-foreground">{g.nombre}</span>
                      <span className="font-mono text-xs text-muted">{g.hora} · {g.formato}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="flex flex-col gap-3 self-start rounded-xl bg-card p-5">
            <h2 className="text-sm font-semibold text-card-fg">Generar ahora</h2>
            <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch} variant="widget">
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-muted">Tipo de reporte
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={FIELD_CLASS}>{TIPOS_REPORTE_LABELS.map((t) => <option key={t}>{t}</option>)}</select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">Período
                  <select disabled className={`${FIELD_CLASS} first-letter:uppercase`}><option>{periodo}</option></select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">Centros
                  <select value={centroId} onChange={(e) => setCentroId(e.target.value)} className={FIELD_CLASS}>
                    <option value="">Todos los centros ({fleet.centros.length})</option>
                    {fleet.centros.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <fieldset className="flex flex-col gap-1 text-xs text-muted">
                  <legend>Formato</legend>
                  <div className="flex gap-4">
                    {FORMATOS_LABELS.map((f) => (
                      <label key={f} className="flex items-center gap-1.5 text-sm text-foreground"><input type="radio" name="formato" checked={formato === f} onChange={() => setFormato(f)} />{f === 'PDF' ? 'PDF (vista para imprimir)' : 'Excel'}</label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="flex flex-col gap-1.5 text-xs text-muted">
                  <legend className="mb-1">Secciones</legend>
                  {(Object.keys(SECCIONES) as Seccion[]).map((key) => {
                    const modulo = SECCIONES[key].modulo;
                    const isBloqueada = modulo !== null && !modulosActivos[modulo];
                    return (
                      <label key={key} className={`flex items-center gap-2 text-sm ${isBloqueada ? 'text-subtle' : 'text-foreground'}`}>
                        <input type="checkbox" disabled={isBloqueada} checked={!isBloqueada && secciones.includes(key)}
                          onChange={() => setSecciones((actual) => (actual.includes(key) ? actual.filter((s) => s !== key) : [...actual, key]))} />
                        {SECCIONES[key].label}{isBloqueada && ' · no contratado'}
                      </label>
                    );
                  })}
                </fieldset>
                <button type="button" disabled={secciones.length === 0} onClick={generar} className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50">Generar reporte</button>
              </div>
            </QueryStateView>
          </section>
        </div>

        <NuevoReporteModal open={isCreating} onClose={() => setIsCreating(false)} onCreate={async (reporte) => {
          if (!await crear(reporte)) return false;
          setIsCreating(false);
          showToast('Reporte programado');
          return true;
        }} />
      </div>
    </div>
  );
}

function NuevoReporteModal({ open, onClose, onCreate }: Readonly<{
  open: boolean;
  onClose: () => void;
  onCreate: (reporte: NuevoReporteProgramado) => Promise<boolean>;
}>) {
  const buildingsQuery = useBuildingsQuery();

  const crear = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const isCreated = await onCreate({
      nombre: String(form.get('nombre')),
      alcance: String(form.get('alcance')),
      frecuencia: String(form.get('frecuencia')),
      formato: String(form.get('formato')),
    });
    if (isCreated) formElement.reset();
  };

  return (
    <Modal open={open} onClose={onClose} title="Programar reporte">
      <p className="mb-4 text-sm text-muted">Se guardará como reporte programado.</p>
      <form onSubmit={(event) => void crear(event)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tipo
          <select name="nombre" className={FIELD_CLASS}>
            {TIPOS_REPORTE_LABELS.map((tipo) => <option key={tipo}>{tipo}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Alcance
          <select name="alcance" className={FIELD_CLASS}>
            <option>{TODOS_LOS_CENTROS}</option>
            {(buildingsQuery.data ?? []).map((building) => <option key={building.id}>{building.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Frecuencia
          <select name="frecuencia" className={FIELD_CLASS}>
            {FRECUENCIAS_LABELS.map((frecuencia) => <option key={frecuencia}>{frecuencia}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Formato
          <select name="formato" className={FIELD_CLASS}>
            {FORMATOS_LABELS.map((formato) => <option key={formato}>{formato}</option>)}
          </select>
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-muted hover:text-foreground">Cancelar</button>
          <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-fg hover:bg-primary-hover">+ Programar reporte</button>
        </div>
      </form>
    </Modal>
  );
}
