import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Modal } from '../../components/ui/Modal';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { NavModuleIcon } from '../../components/layout/sidebar-icons';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { requiereAtencion, type Centro, type Remarcador } from './fleet';
import { formatNumber } from './format';
import { PageAction } from './PageAction';
import { canEditSection, EMS_SECTION_PATHS } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { StatusBadge } from './StatusBadge';
import { EmptyFilterState, SearchInput } from './table';
import { useEmsFleet } from './useEmsFleet';
import { useEmsRole } from './useEmsRole';

type Filtro = 'todos' | 'atencion' | 'sin_lecturas';

const FILTRO_LABEL: Record<Filtro, string> = { todos: 'Todos', atencion: 'Requieren atención', sin_lecturas: 'Sin lecturas' };
const POR_PAGINA = 9;
const FIELD_CLASS = 'h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:border-accent focus:outline-none';
const BAR_SEGMENTS = 10;

export function pctEnLinea(centro: Centro, remarcadores: Remarcador[]): number {
  const propios = remarcadores.filter((r) => r.centroId === centro.id);
  return propios.length === 0 ? 0 : Math.round((propios.filter((r) => r.estado === 'conectado').length / propios.length) * 100);
}

export function tonoLecturas(pct: number): string {
  if (pct >= 80) return 'bg-accent';
  if (pct >= 40) return 'bg-warning';
  return 'bg-danger';
}

export function CentrosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { phase, error, refetch, centros, remarcadores } = useEmsFleet();
  const margenMinimo = useAppStore((s) => s.margenMinimo);
  const canEdit = canEditSection(useEmsRole(), 'centros');
  const filtro = (searchParams.get('filtro') as Filtro | null) ?? 'todos';
  const [busqueda, setBusqueda] = useState('');
  const [cliente, setCliente] = useState('');
  const [pagina, setPagina] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const predicados: Record<Filtro, (centro: Centro) => boolean> = {
    todos: () => true,
    atencion: (centro) => requiereAtencion(centro, margenMinimo),
    sin_lecturas: (centro) => pctEnLinea(centro, remarcadores) === 0,
  };
  const texto = busqueda.trim().toLowerCase();
  const filtrados = centros.filter((centro) => predicados[filtro](centro)
    && (cliente === '' || centro.tarifa?.cliente === cliente)
    && (texto === '' || [centro.name, centro.code, centro.address ?? ''].some((campo) => campo.toLowerCase().includes(texto))));
  const visibles = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const clientes = [...new Set(centros.flatMap((centro) => (centro.tarifa ? [centro.tarifa.cliente] : [])))];

  const elegirFiltro = (key: Filtro) => { setSearchParams(key === 'todos' ? {} : { filtro: key }); setPagina(0); };
  const quitarFiltros = () => { elegirFiltro('todos'); setBusqueda(''); setCliente(''); };

  usePageTitle('Centros', 'Núcleo / Centros', canEdit ? <PageAction label="+ Nuevo centro" onClick={() => setIsCreating(true)} /> : undefined);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className={SEGMENT_TRACK_CLASS} role="tablist" aria-label="Vista rápida">
            {(Object.keys(FILTRO_LABEL) as Filtro[]).map((key) => (
              <button key={key} type="button" role="tab" aria-selected={filtro === key} onClick={() => elegirFiltro(key)} className={segmentClass(filtro === key)}>
                {FILTRO_LABEL[key]} · {centros.filter(predicados[key]).length}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <SearchInput value={busqueda} onChange={(value) => { setBusqueda(value); setPagina(0); }} placeholder="Buscar centro" />
            <select value={cliente} onChange={(event) => { setCliente(event.target.value); setPagina(0); }} aria-label="Cliente" className={FIELD_CLASS}>
              <option value="">Todos los clientes</option>
              {clientes.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </div>
        </div>

        <QueryStateView phase={phase} error={error} refetch={refetch}>
          {filtrados.length === 0 ? (
            <div className="rounded-xl bg-card">
              <EmptyFilterState title="Sin centros que coincidan" text="Ajusta la búsqueda o la vista rápida para volver a ver la cartera." onReset={quitarFiltros} />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibles.map((centro) => (
                <CentroCard key={centro.id} centro={centro} pctEnLinea={pctEnLinea(centro, remarcadores)} onOpen={() => navigate(`${EMS_SECTION_PATHS.centros}/${centro.id}`)} />
              ))}
            </div>
          )}
          <footer className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>Mostrando {visibles.length} de {filtrados.length} centros</span>
            <div className="flex gap-2">
              <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-foreground disabled:opacity-40">Anterior</button>
              <button type="button" disabled={(pagina + 1) * POR_PAGINA >= filtrados.length} onClick={() => setPagina((p) => p + 1)} className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-foreground disabled:opacity-40">Siguiente</button>
            </div>
          </footer>
        </QueryStateView>

        <NuevoCentroModal open={isCreating} onClose={() => setIsCreating(false)} />
      </div>
    </div>
  );
}

function CentroCard({ centro, pctEnLinea, onOpen }: Readonly<{ centro: Centro; pctEnLinea: number; onOpen: () => void }>) {
  const encendidos = Math.round((pctEnLinea / 100) * BAR_SEGMENTS);
  const stats = [
    { label: 'Consumo', value: formatNumber(centro.consumoMesKwh / 1000, 1), unit: 'MWh' },
    { label: 'Margen', value: centro.margen ? formatNumber(centro.margen.margenPct, 1) : '—', unit: centro.margen ? '%' : '' },
    { label: 'Remarcadores', value: String(centro.remarcadores), unit: '' },
  ];
  return (
    <button type="button" onClick={onOpen} className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-4 text-left transition-shadow hover:shadow-float">
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-raised text-foreground"><NavModuleIcon name="building" className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-card-fg">{centro.name}</p>
          <p className="truncate text-xs text-muted">{[centro.tarifa?.cliente, centro.address].filter(Boolean).join(' · ') || centro.code}</p>
        </div>
        <StatusBadge estado={centro.estado} />
      </header>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-lg bg-raised px-2.5 py-2">
            <p className="truncate text-[10px] text-muted">{stat.label}</p>
            <p className="font-mono text-sm font-semibold text-foreground">{stat.value}<span className="ml-0.5 text-[10px] font-normal text-muted">{stat.unit}</span></p>
          </div>
        ))}
      </div>
      <footer className="flex items-end justify-between">
        <div>
          <p className="mb-1 text-[11px] text-muted">Remarcadores en línea</p>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5" aria-hidden="true">
              {Array.from({ length: BAR_SEGMENTS }, (_, i) => <span key={i} className={`h-3 w-1.5 rounded-sm ${i < encendidos ? tonoLecturas(pctEnLinea) : 'bg-border'}`} />)}
            </div>
            <span className="font-mono text-xs text-foreground">{pctEnLinea} %</span>
          </div>
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground" aria-hidden="true">↗</span>
      </footer>
    </button>
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
