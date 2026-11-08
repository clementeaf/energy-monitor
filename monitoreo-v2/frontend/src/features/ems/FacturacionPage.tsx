import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { usePageTitle } from '../../store/usePageTitleStore';
import { useToastStore } from '../../store/useToastStore';
import { AnularModal, CargarFacturaModal } from './DocumentoModals';
import { ACCIONES_POR_ESTADO, detalleCsv, ESTADO_DOCUMENTO, imprimirNota, listarDocumentos, type DocumentoListado, type EstadoDocumento, type NotaCobro, type OrigenDocumento, type TipoDocumento } from './facturacion';
import { descargarArchivo } from './exportar';
import { formatNumber } from './format';
import { KpiTile } from './KpiTile';
import { PageAction } from './PageAction';
import { canEditSection, EMS_SECTION_PATHS } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { BulkBar, EmptyFilterState, onRowKeyDown, RowMenu, SearchInput, SelectAllCheckbox, useSelection } from './table';
import { useDocumentoActions, useNotasCobro } from './useFacturacion';
import { useEmsRole } from './useEmsRole';

type VistaTipo = 'todos' | TipoDocumento;

const VISTAS: Record<VistaTipo, string> = { todos: 'Todos', nota: 'Notas de cobro', factura: 'Facturas' };
const TIPO_LABEL: Record<TipoDocumento, string> = { nota: 'Nota de cobro', factura: 'Factura' };
const ORIGEN_CLS: Record<OrigenDocumento, string> = {
  EMS: 'text-module-facturacion-ink bg-module-facturacion-bg',
  ERP: 'text-info-ink bg-info-bg',
  Manual: 'text-neutral-ink bg-neutral-bg',
};
const FIELD_CLASS = 'h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:border-accent focus:outline-none';
const POR_COBRAR: EstadoDocumento[] = ['emitida', 'enviada', 'vencida'];

export function EstadoDocumentoBadge({ estado }: Readonly<{ estado: EstadoDocumento }>) {
  const badge = ESTADO_DOCUMENTO[estado];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.icon} {badge.label}</span>;
}

export function OrigenTag({ origen }: Readonly<{ origen: OrigenDocumento }>) {
  return <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${ORIGEN_CLS[origen]}`}>{origen}</span>;
}

export function filtrarDocumentos(documentos: DocumentoListado[], filtros: { vista: VistaTipo; busqueda: string; centroId: string; estado: '' | EstadoDocumento }): DocumentoListado[] {
  const texto = filtros.busqueda.trim().toLowerCase();
  return documentos.filter((doc) =>
    (filtros.vista === 'todos' || doc.tipo === filtros.vista)
    && (filtros.centroId === '' || doc.nota.centroId === filtros.centroId)
    && (filtros.estado === '' || doc.estado === filtros.estado)
    && (texto === '' || [doc.folio, doc.nota.centroName, doc.nota.cliente].some((campo) => campo.toLowerCase().includes(texto))));
}

export function FacturacionPage() {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const canEdit = canEditSection(useEmsRole(), 'facturacion');
  const { phase, error, refetch, notas } = useNotasCobro();
  const { ejecutar, vincularFactura } = useDocumentoActions();
  const [vista, setVista] = useState<VistaTipo>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [searchParams] = useSearchParams();
  const [centroId, setCentroId] = useState(searchParams.get('centro') ?? '');
  const [estado, setEstado] = useState<'' | EstadoDocumento>('');
  const [isCargando, setIsCargando] = useState(false);
  const [porAnular, setPorAnular] = useState<NotaCobro | null>(null);
  const selection = useSelection();

  const documentos = useMemo(() => listarDocumentos(notas), [notas]);
  const visibles = filtrarDocumentos(documentos, { vista, busqueda, centroId, estado });
  const vigentes = notas.filter((nota) => nota.estado !== 'anulada');
  const vencidas = notas.filter((nota) => nota.estado === 'vencida');
  const facturas = documentos.filter((doc) => doc.tipo === 'factura').length;
  const periodo = notas[0]?.periodo ?? '';
  const centros = [...new Map(notas.map((nota) => [nota.centroId, nota.centroName]))];
  const sum = (lista: NotaCobro[]) => lista.reduce((total, nota) => total + nota.total, 0);

  usePageTitle('Facturación', 'Facturación / Documentos', canEdit ? <PageAction label="Cargar factura" onClick={() => setIsCargando(true)} /> : undefined);

  const resetFiltros = () => { setVista('todos'); setBusqueda(''); setCentroId(''); setEstado(''); };
  const descargarSeleccion = () => {
    const seleccionadas = [...new Set(documentos.filter((doc) => selection.selected.has(doc.id)).map((doc) => doc.nota))];
    descargarArchivo(`documentos-${seleccionadas.length}.csv`, detalleCsv(seleccionadas), 'text/csv;charset=utf-8');
    showToast(`${seleccionadas.length} documento${seleccionadas.length === 1 ? '' : 's'} descargado${seleccionadas.length === 1 ? '' : 's'}`);
    selection.clear();
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <QueryStateView phase={phase} error={error} refetch={refetch}>
        <div className="flex flex-col gap-4">
          <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiTile variant="inverse" label="Facturado" value={`$${formatNumber(sum(vigentes))}`} sub="IVA incluido · notas vigentes" />
            <KpiTile label="Por cobrar" value={`$${formatNumber(sum(vigentes.filter((nota) => POR_COBRAR.includes(nota.estado))))}`} sub="Emitidas, enviadas y vencidas" />
            <KpiTile label="Vencido" value={`$${formatNumber(sum(vencidas))}`} sub={`${vencidas.length} documento${vencidas.length === 1 ? '' : 's'} · ver`} tone={vencidas.length > 0 ? 'negative' : 'neutral'} onClick={() => { setEstado('vencida'); setVista('todos'); }} />
            <KpiTile label="Documentos" value={String(documentos.length)} sub={`${notas.length} notas · ${facturas} facturas`} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className={SEGMENT_TRACK_CLASS} role="tablist" aria-label="Tipo de documento">
              {(Object.keys(VISTAS) as VistaTipo[]).map((key) => (
                <button key={key} type="button" role="tab" aria-selected={vista === key} onClick={() => setVista(key)} className={segmentClass(vista === key)}>{VISTAS[key]}</button>
              ))}
            </div>
            <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar folio, centro o cliente" />
            <select value={centroId} onChange={(event) => setCentroId(event.target.value)} aria-label="Centro" className={FIELD_CLASS}>
              <option value="">Todos los centros</option>
              {centros.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <select value={estado} onChange={(event) => setEstado(event.target.value as '' | EstadoDocumento)} aria-label="Estado" className={FIELD_CLASS}>
              <option value="">Todos los estados</option>
              {(Object.keys(ESTADO_DOCUMENTO) as EstadoDocumento[]).map((key) => <option key={key} value={key}>{ESTADO_DOCUMENTO[key].label}</option>)}
            </select>
          </div>

          <BulkBar count={selection.selected.size} noun="documento" onClear={selection.clear}>
            <button type="button" onClick={descargarSeleccion} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-fg hover:bg-primary-hover">Descargar (Excel)</button>
          </BulkBar>

          <div className="min-h-0 flex-1 rounded-xl bg-card">
            <header className="px-5 py-4">
              <h2 className="text-sm font-semibold text-card-fg first-letter:uppercase">Documentos de {periodo}</h2>
              <p className="text-xs text-card-muted">{documentos.length} documentos · {notas.length} notas de cobro · {facturas} facturas</p>
            </header>
            {notas.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted">Sin documentos: ningún centro tiene tarifa de venta configurada para este período.</p>
            ) : visibles.length === 0 ? (
              <EmptyFilterState title="Sin documentos con estos filtros" text="Prueba con otro estado, centro o tipo." onReset={resetFiltros} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-card-border bg-raised">
                      <th className="w-10 px-4 py-2.5"><SelectAllCheckbox selectedCount={selection.selected.size} totalCount={visibles.length} onToggle={() => selection.toggleAll(visibles.map((doc) => doc.id))} /></th>
                      {['Folio', 'Centro · cliente', 'Período', 'Total', 'Estado', 'Origen', 'Vence', ''].map((label) => (
                        <th key={label} className={`px-4 py-2.5 text-[11px] font-normal text-muted ${label === 'Total' ? 'text-right' : 'text-left'}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {visibles.map((doc) => {
                      const abrir = () => navigate(`${EMS_SECTION_PATHS.facturacion}/${doc.nota.id}`);
                      const isAnulado = doc.estado === 'anulada';
                      return (
                        <tr key={doc.id} tabIndex={0} onClick={abrir} onKeyDown={onRowKeyDown(abrir)} className="cursor-pointer hover:bg-raised">
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            <input type="checkbox" aria-label={`Seleccionar ${doc.folio}`} checked={selection.selected.has(doc.id)} onChange={() => selection.toggle(doc.id)} className="rounded border-border" />
                          </td>
                          <td className="px-4 py-3">
                            <p className={`font-mono text-sm font-medium text-foreground ${isAnulado ? 'line-through' : ''}`}>{doc.folio}</p>
                            <p className="text-[11px] text-muted">{TIPO_LABEL[doc.tipo]}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-foreground">{doc.nota.centroName}</p>
                            <p className="text-[11px] text-muted">{doc.nota.cliente}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted first-letter:uppercase">{doc.nota.periodo}</td>
                          <td className={`px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground ${isAnulado ? 'line-through' : ''}`}>${formatNumber(doc.total)}</td>
                          <td className="px-4 py-3"><EstadoDocumentoBadge estado={doc.estado} /></td>
                          <td className="px-4 py-3"><OrigenTag origen={doc.origen} /></td>
                          <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted">{doc.nota.vencimiento}</td>
                          <td className="px-4 py-3">
                            <RowMenu label={`Más opciones de ${doc.folio}`} items={[
                              { label: 'Abrir', onSelect: abrir },
                              { label: 'Descargar PDF', onSelect: () => imprimirNota(doc.nota) },
                              { label: 'Descargar detalle (Excel)', onSelect: () => descargarArchivo(`${doc.nota.folio}.csv`, detalleCsv([doc.nota]), 'text/csv;charset=utf-8') },
                              { label: 'Copiar enlace', onSelect: () => { void navigator.clipboard.writeText(`${window.location.origin}${EMS_SECTION_PATHS.facturacion}/${doc.nota.id}`); showToast('Enlace copiado'); } },
                              ...(canEdit && doc.tipo === 'nota' && ACCIONES_POR_ESTADO[doc.nota.estado].includes('anular') ? [{ label: 'Anular', onSelect: () => setPorAnular(doc.nota), isDanger: true }] : []),
                            ]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {visibles.length > 0 && <footer className="px-5 py-3 text-xs text-muted">Mostrando {visibles.length} de {documentos.length}</footer>}
          </div>
        </div>
        <CargarFacturaModal open={isCargando} notas={notas} notaInicial={null} onClose={() => setIsCargando(false)}
          onVincular={(nota, factura) => { vincularFactura(nota, factura); setIsCargando(false); showToast(`Factura ${factura.folio} vinculada a ${nota.folio}`); }} />
        <AnularModal nota={porAnular} onClose={() => setPorAnular(null)}
          onConfirm={(motivo) => { if (porAnular) ejecutar(porAnular, 'anular', motivo); setPorAnular(null); showToast('Documento anulado'); }} />
      </QueryStateView>
    </div>
  );
}
