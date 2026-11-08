import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { diferenciaMontos, parseDteXml, validarCargaFactura, type Dte, type FacturaVinculada, type NotaCobro } from './facturacion';
import { formatNumber } from './format';

const FIELD_CLASS = 'h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none';
const MAX_BYTES = 10 * 1024 * 1024;

function Actions({ onClose, submitLabel, isDanger = false, isDisabled = false }: Readonly<{ onClose: () => void; submitLabel: string; isDanger?: boolean; isDisabled?: boolean }>) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-foreground">Cancelar</button>
      <button type="submit" disabled={isDisabled} className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${isDanger ? 'bg-danger text-white' : 'bg-primary text-primary-fg hover:bg-primary-hover'}`}>{submitLabel}</button>
    </div>
  );
}

export function AnularModal({ nota, onClose, onConfirm }: Readonly<{ nota: NotaCobro | null; onClose: () => void; onConfirm: (motivo: string) => void }>) {
  const [motivo, setMotivo] = useState('');
  const cerrar = () => { setMotivo(''); onClose(); };
  return (
    <Modal open={nota !== null} onClose={cerrar} title="Anular documento">
      <form onSubmit={(event) => { event.preventDefault(); onConfirm(motivo.trim()); setMotivo(''); }}>
        <p className="text-sm text-muted">{nota?.folio} quedará sin validez. No se borra: conserva su detalle e historial con la marca «Anulado».</p>
        <label className="mt-4 flex flex-col gap-1 text-xs text-muted">
          Motivo (obligatorio)
          <textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={3} required className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground focus:border-accent focus:outline-none" />
        </label>
        <Actions onClose={cerrar} submitLabel="Anular documento" isDanger isDisabled={motivo.trim() === ''} />
      </form>
    </Modal>
  );
}

export function ReenviarModal({ nota, destinatarioInicial, onClose, onConfirm }: Readonly<{ nota: NotaCobro | null; destinatarioInicial: string; onClose: () => void; onConfirm: (destinatarios: string) => void }>) {
  const [destinatarios, setDestinatarios] = useState(destinatarioInicial);
  return (
    <Modal open={nota !== null} onClose={onClose} title="Reenviar documento">
      <form onSubmit={(event) => { event.preventDefault(); onConfirm(destinatarios.trim()); }}>
        <p className="text-sm text-muted">Se enviará {nota?.folio} con su detalle a estos destinatarios.</p>
        <label className="mt-4 flex flex-col gap-1 text-xs text-muted">
          Destinatarios (separados por coma)
          <input type="text" value={destinatarios} onChange={(event) => setDestinatarios(event.target.value)} required className={FIELD_CLASS} />
        </label>
        <Actions onClose={onClose} submitLabel="Reenviar" isDisabled={destinatarios.trim() === ''} />
      </form>
    </Modal>
  );
}

export function CargarFacturaModal({ open, notas, notaInicial, onClose, onVincular }: Readonly<{
  open: boolean;
  notas: NotaCobro[];
  notaInicial: NotaCobro | null;
  onClose: () => void;
  onVincular: (nota: NotaCobro, factura: FacturaVinculada) => void;
}>) {
  const [pdf, setPdf] = useState<File | null>(null);
  const [xml, setXml] = useState<{ name: string; dte: Dte | null } | null>(null);
  const [notaId, setNotaId] = useState(notaInicial?.id ?? '');
  const [motivo, setMotivo] = useState('');
  const disponibles = notas.filter((nota) => !nota.factura && nota.estado !== 'anulada');
  const nota = notas.find((candidata) => candidata.id === (notaId || notaInicial?.id)) ?? null;
  const dte = xml?.dte ?? null;
  const error = validarCargaFactura({ hasPdf: pdf !== null, dte, nota, foliosExistentes: notas.flatMap((n) => (n.factura ? [n.factura.folio] : [])), motivo });
  const hayDiferencia = dte !== null && nota !== null && dte.monto !== nota.total;

  const reset = () => { setPdf(null); setXml(null); setNotaId(''); setMotivo(''); };
  const cerrar = () => { reset(); onClose(); };

  const recibirArchivos = async (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      if (file.size > MAX_BYTES) continue;
      if (file.name.toLowerCase().endsWith('.pdf')) setPdf(file);
      if (file.name.toLowerCase().endsWith('.xml')) setXml({ name: file.name, dte: parseDteXml(await file.text()) });
    }
  };

  const vincular = () => {
    if (error || !nota || !dte) return;
    onVincular(nota, { folio: dte.folio, fecha: dte.fecha || new Date().toLocaleDateString('sv-SE'), monto: dte.monto, origen: 'Manual', motivoDiferencia: hayDiferencia ? motivo.trim() : null });
    reset();
  };

  return (
    <Modal open={open} onClose={cerrar} title="Cargar factura">
      <form onSubmit={(event) => { event.preventDefault(); vincular(); }} className="flex flex-col gap-4">
        <p className="text-sm text-muted">Sube el PDF y el XML emitidos en el SII y elige la nota de cobro a la que corresponde.</p>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nota de cobro
          <select value={nota?.id ?? ''} onChange={(event) => setNotaId(event.target.value)} className={FIELD_CLASS}>
            <option value="">Elegir…</option>
            {(notaInicial && !disponibles.includes(notaInicial) ? [notaInicial, ...disponibles] : disponibles).map((candidata) => (
              <option key={candidata.id} value={candidata.id}>{candidata.folio} · {candidata.centroName} · $ {formatNumber(candidata.total)}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Folio de la factura
            <input type="text" readOnly value={dte?.folio ?? ''} placeholder="Se lee del XML" className={FIELD_CLASS} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Monto en el XML
            <input type="text" readOnly value={dte ? `$ ${formatNumber(dte.monto)}` : ''} placeholder="Se lee del XML" className={FIELD_CLASS} />
          </label>
        </div>
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border-strong px-4 py-6 text-center hover:border-accent-strong"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); void recibirArchivos(event.dataTransfer.files); }}>
          <span className="text-sm font-medium text-foreground">Arrastra los archivos o haz clic para buscar</span>
          <span className="text-xs text-muted">PDF y XML del documento tributario · máx. 10 MB</span>
          <input type="file" accept=".pdf,.xml" multiple className="sr-only" onChange={(event) => void recibirArchivos(event.target.files)} />
        </label>
        {(pdf || xml) && (
          <ul className="flex flex-col gap-2 text-xs">
            {pdf && <ArchivoCargado nombre={pdf.name} detalle={`${formatNumber(pdf.size / 1024)} KB`} isValido />}
            {xml && <ArchivoCargado nombre={xml.name} detalle={dte ? `${dte.folio} · $ ${formatNumber(dte.monto)}` : 'XML no válido'} isValido={dte !== null} />}
          </ul>
        )}
        {dte && nota && !hayDiferencia && (
          <div role="status" className="rounded-lg bg-success-bg px-3 py-2 text-xs text-success-ink">✓ Los montos coinciden: la factura y la nota suman $ {formatNumber(nota.total)}.</div>
        )}
        {hayDiferencia && nota && dte && (
          <div className="rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning-ink">
            ⚠ Diferencia de montos: la factura suma $ {formatNumber(dte.monto)} y la nota $ {formatNumber(nota.total)} ({dte.monto > nota.total ? '+' : ''}{formatNumber(dte.monto - nota.total)}).
            <input type="text" value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Motivo para vincular igual" className={`${FIELD_CLASS} mt-2`} />
          </div>
        )}
        {error && (pdf || xml) && <p className="text-xs text-danger">{error}</p>}
        <Actions onClose={cerrar} submitLabel="Vincular factura" isDisabled={error !== null} />
      </form>
    </Modal>
  );
}

function ArchivoCargado({ nombre, detalle, isValido }: Readonly<{ nombre: string; detalle: string; isValido: boolean }>) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-raised px-3 py-2.5 text-foreground">
      <span aria-hidden className="text-muted">▤</span>
      <span className="flex-1 truncate">{nombre}</span>
      <span className={isValido ? 'text-muted' : 'text-danger'}>{detalle}</span>
      <span aria-label={isValido ? 'Válido' : 'No válido'} className={isValido ? 'text-success' : 'text-danger'}>{isValido ? '✓' : '✕'}</span>
    </li>
  );
}

export function DiferenciaMontosAlert({ nota }: Readonly<{ nota: NotaCobro }>) {
  const diferencia = diferenciaMontos(nota);
  if (diferencia === 0) return null;
  return (
    <div role="alert" className="rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning-ink">
      ⚠ Diferencia de montos: la factura {nota.factura?.folio} difiere en $ {formatNumber(diferencia)} del total de la nota. Revísala antes de enviar.
    </div>
  );
}
