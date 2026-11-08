import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { usePageTitle } from '../../store/usePageTitleStore';
import { useToastStore } from '../../store/useToastStore';
import { AnularModal, CargarFacturaModal, DiferenciaMontosAlert, ReenviarModal } from './DocumentoModals';
import { ACCIONES, ACCIONES_POR_ESTADO, detalleCsv, imprimirNota, type AccionDocumento, type NotaCobro } from './facturacion';
import { EstadoDocumentoBadge, OrigenTag } from './FacturacionPage';
import { descargarArchivo } from './exportar';
import { formatDateTime, formatNumber } from './format';
import { canEditSection, EMS_SECTION_PATHS } from './roles';
import { RowMenu } from './table';
import { useDocumentoActions, useNotasCobro } from './useFacturacion';
import { useEmsRole } from './useEmsRole';

const ACCIONES_DIRECTAS: readonly AccionDocumento[] = ['emitir', 'enviar', 'registrarPago'];

function clp(value: number): string {
  return `$ ${formatNumber(value)}`;
}

export function DocumentoPage() {
  const { documentoId = '' } = useParams<{ documentoId: string }>();
  const { phase, error, refetch, notas } = useNotasCobro();
  const nota = notas.find((candidata) => candidata.id === documentoId) ?? null;
  usePageTitle(nota?.folio ?? 'Documento', `Facturación / Documentos${nota ? ` / ${nota.folio}` : ''}`);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <QueryStateView phase={phase} error={error} refetch={refetch}>
        {nota ? <DocumentoDetalle nota={nota} notas={notas} /> : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-foreground">No existe el documento {documentoId}</p>
            <Link to={EMS_SECTION_PATHS.facturacion} className="text-xs text-muted underline hover:text-foreground">Volver a Facturación</Link>
          </div>
        )}
      </QueryStateView>
    </div>
  );
}

function DocumentoDetalle({ nota, notas }: Readonly<{ nota: NotaCobro; notas: NotaCobro[] }>) {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const canEdit = canEditSection(useEmsRole(), 'facturacion');
  const { ejecutar, vincularFactura } = useDocumentoActions();
  const [modal, setModal] = useState<'anular' | 'reenviar' | 'cargar' | null>(null);
  const disponibles = canEdit ? ACCIONES_POR_ESTADO[nota.estado] : [];
  const totalKwh = nota.remarcadores.reduce((total, remarcador) => total + remarcador.kwh, 0);
  const isAnulada = nota.estado === 'anulada';
  const ultimoEnvio = nota.eventos.find((evento) => evento.titulo.startsWith(ACCIONES.enviar.evento) || evento.titulo.startsWith(ACCIONES.reenviar.evento));

  const accionar = (accion: AccionDocumento) => {
    ejecutar(nota, accion);
    showToast(`${nota.folio}: ${ACCIONES[accion].evento.toLowerCase()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <EstadoDocumentoBadge estado={nota.estado} />
        <OrigenTag origen="EMS" />
        {ultimoEnvio && <span className="text-xs text-muted">{ultimoEnvio.titulo} · {formatDateTime(ultimoEnvio.fecha)}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {ACCIONES_DIRECTAS.filter((accion) => disponibles.includes(accion)).map((accion) => (
            <button key={accion} type="button" onClick={() => accionar(accion)} className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover">{ACCIONES[accion].label}</button>
          ))}
          <button type="button" onClick={() => descargarArchivo(`${nota.folio}.csv`, detalleCsv([nota]), 'text/csv;charset=utf-8')} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">Descargar Excel</button>
          {disponibles.includes('reenviar') && (
            <button type="button" onClick={() => setModal('reenviar')} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">Reenviar</button>
          )}
          <button type="button" onClick={() => imprimirNota(nota)} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-fg hover:bg-primary-hover">Descargar PDF</button>
          {disponibles.includes('anular') && <RowMenu label="Más opciones" items={[{ label: 'Anular', onSelect: () => setModal('anular'), isDanger: true }]} />}
        </div>
      </div>

      {isAnulada && <div role="status" className="rounded-xl bg-neutral-bg px-4 py-3 text-sm font-medium text-neutral-ink">✕ Documento anulado: se conserva su detalle y no puede reenviarse.</div>}
      <DiferenciaMontosAlert nota={nota} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <section className="grid gap-4 rounded-xl bg-card p-5 md:grid-cols-3">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:col-span-2">
              <Campo label="Cliente" value={nota.cliente} />
              <Campo label="Centro" value={<Link to={`${EMS_SECTION_PATHS.centros}/${nota.centroId}`} className="underline decoration-border-strong hover:decoration-foreground">{nota.centroName}</Link>} />
              <Campo label="Tarifa de venta" value={`${clp(nota.lineas[0]?.precioUnitario ?? 0)} / kWh`} />
              <Campo label="Período" value={<span className="inline-block first-letter:uppercase">{nota.periodo}</span>} />
              <Campo label="Emisión · vencimiento" value={`${nota.emision} · ${nota.vencimiento}`} />
            </dl>
            <div className="flex flex-col justify-center rounded-xl bg-primary px-5 py-4 text-primary-fg">
              <p className="text-xs opacity-70">Total a pagar</p>
              <p className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${isAnulada ? 'line-through' : ''}`}>{clp(nota.total)}</p>
              <p className="mt-1 text-xs opacity-70">IVA incluido · CLP</p>
            </div>
          </section>

          <section className="rounded-xl bg-card">
            <header className="flex items-baseline justify-between border-b border-card-border px-5 py-3">
              <h2 className="text-sm font-semibold text-card-fg">Detalle del cobro</h2>
              <span className="text-xs text-muted">Calculado con las lecturas del período</span>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-raised text-[11px] text-muted">
                    <th className="px-5 py-2 text-left font-medium">Concepto</th>
                    <th className="px-5 py-2 text-right font-medium">Cantidad</th>
                    <th className="px-5 py-2 text-left font-medium">Unidad</th>
                    <th className="px-5 py-2 text-right font-medium">Precio unitario</th>
                    <th className="px-5 py-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {nota.lineas.map((linea) => (
                    <tr key={linea.concepto}>
                      <td className="px-5 py-3 text-foreground">{linea.concepto}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">{formatNumber(linea.cantidad)}</td>
                      <td className="px-5 py-3 text-muted">{linea.unidad}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">{clp(linea.precioUnitario)}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">{clp(linea.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-card-border">
                  <TotalRow label="Neto" value={clp(nota.neto)} />
                  <TotalRow label="IVA 19 %" value={clp(nota.iva)} />
                  <TotalRow label="Total" value={clp(nota.total)} isStrong />
                </tfoot>
              </table>
            </div>
          </section>

          <section className="rounded-xl bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-card-fg">Remarcadores incluidos</h2>
            <ul className="divide-y divide-card-border">
              {nota.remarcadores.map((remarcador) => (
                <li key={remarcador.id}>
                  <button type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.remarcadores}/${remarcador.id}`)} className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-raised">
                    <span className="font-mono text-foreground">{remarcador.code}</span>
                    <span className="flex-1 truncate text-xs text-muted">{remarcador.name}</span>
                    <span className="font-mono tabular-nums text-foreground">{formatNumber(remarcador.kwh)} kWh</span>
                    <span className="w-12 text-right font-mono text-xs tabular-nums text-muted">{totalKwh > 0 ? `${formatNumber((remarcador.kwh / totalKwh) * 100)} %` : '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-card-border pt-3 text-sm"><span className="text-muted">Total del período</span><span className="font-mono font-semibold tabular-nums">{formatNumber(totalKwh)} kWh</span></p>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-card-fg">Factura vinculada</h2>
            {nota.factura ? (
              <div className="flex items-center gap-3 rounded-lg bg-raised px-3 py-3">
                <div className="flex-1">
                  <p className="text-xs text-muted">Factura electrónica · DTE 33 <OrigenTag origen={nota.factura.origen} /></p>
                  <p className="mt-1 font-mono text-sm text-foreground">{nota.factura.folio} · {nota.factura.fecha} · {clp(nota.factura.monto)}</p>
                </div>
              </div>
            ) : canEdit && !isAnulada ? (
              <button type="button" onClick={() => setModal('cargar')} className="w-full rounded-lg border-2 border-dashed border-border-strong px-3 py-4 text-sm font-medium text-foreground hover:border-accent-strong">Cargar factura (PDF + XML)</button>
            ) : (
              <p className="text-sm text-muted">Sin factura vinculada. El ERP aún no está integrado.</p>
            )}
          </section>

          <section className="rounded-xl bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-card-fg">Historial</h2>
            <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
              {nota.eventos.map((evento) => (
                <li key={`${evento.fecha}-${evento.titulo}`} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-accent-strong" />
                  <p className="text-sm text-foreground">{evento.titulo}</p>
                  <p className="text-xs text-muted">{formatDateTime(evento.fecha)} · {evento.autor}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <AnularModal nota={modal === 'anular' ? nota : null} onClose={() => setModal(null)} onConfirm={(motivo) => { ejecutar(nota, 'anular', motivo); setModal(null); showToast('Documento anulado'); }} />
      <ReenviarModal nota={modal === 'reenviar' ? nota : null} destinatarioInicial="" onClose={() => setModal(null)} onConfirm={(destinatarios) => { ejecutar(nota, 'reenviar', destinatarios); setModal(null); showToast(`Reenviado a ${destinatarios}`); }} />
      <CargarFacturaModal open={modal === 'cargar'} notas={notas} notaInicial={nota} onClose={() => setModal(null)}
        onVincular={(destino, factura) => { vincularFactura(destino, factura); setModal(null); showToast(`Factura ${factura.folio} vinculada`); }} />
    </div>
  );
}

function Campo({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}

function TotalRow({ label, value, isStrong = false }: Readonly<{ label: string; value: string; isStrong?: boolean }>) {
  return (
    <tr>
      <td colSpan={4} className={`px-5 py-2 text-right ${isStrong ? 'font-semibold text-foreground' : 'text-muted'}`}>{label}</td>
      <td className={`px-5 py-2 text-right font-mono tabular-nums ${isStrong ? 'font-semibold text-foreground' : ''}`}>{value}</td>
    </tr>
  );
}
