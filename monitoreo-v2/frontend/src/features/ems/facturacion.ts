import type { Centro, Remarcador } from './fleet';
import { escapeHtml, imprimirHtml } from './exportar';
import { formatNumber, formatPeriodo } from './format';

export type EstadoDocumento = 'borrador' | 'emitida' | 'enviada' | 'pagada' | 'vencida' | 'anulada';
export type TipoDocumento = 'nota' | 'factura';
export type OrigenDocumento = 'EMS' | 'ERP' | 'Manual';
export type AccionDocumento = 'emitir' | 'enviar' | 'reenviar' | 'registrarPago' | 'anular';

export interface LineaCobro {
  concepto: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface FacturaVinculada {
  folio: string;
  fecha: string;
  monto: number;
  origen: Exclude<OrigenDocumento, 'EMS'>;
  motivoDiferencia: string | null;
}

export interface EventoDocumento {
  titulo: string;
  fecha: string;
  autor: string;
}

export interface SeguimientoDocumento {
  estado?: EstadoDocumento;
  factura?: FacturaVinculada;
  eventos: EventoDocumento[];
}

export interface RemarcadorIncluido {
  id: string;
  code: string;
  name: string;
  kwh: number;
}

export interface NotaCobro {
  id: string;
  folio: string;
  centroId: string;
  centroName: string;
  cliente: string;
  periodo: string;
  emision: string;
  vencimiento: string;
  lineas: LineaCobro[];
  neto: number;
  iva: number;
  total: number;
  remarcadores: RemarcadorIncluido[];
  estado: EstadoDocumento;
  factura: FacturaVinculada | null;
  eventos: EventoDocumento[];
}

export interface DocumentoListado {
  id: string;
  nota: NotaCobro;
  tipo: TipoDocumento;
  folio: string;
  total: number;
  estado: EstadoDocumento;
  origen: OrigenDocumento;
}

export const IVA = 0.19;
const DIAS_PARA_PAGAR = 30;

export const ESTADO_DOCUMENTO: Record<EstadoDocumento, { label: string; icon: string; cls: string }> = {
  borrador: { label: 'Borrador', icon: '○', cls: 'text-neutral-ink bg-neutral-bg' },
  emitida: { label: 'Emitida', icon: '▤', cls: 'text-info-ink bg-info-bg' },
  enviada: { label: 'Enviada', icon: '✉', cls: 'text-info-ink bg-info-bg' },
  pagada: { label: 'Pagada', icon: '✓', cls: 'text-success-ink bg-success-bg' },
  vencida: { label: 'Vencida', icon: '!', cls: 'text-danger-ink bg-danger-bg' },
  anulada: { label: 'Anulada', icon: '✕', cls: 'text-neutral-ink bg-neutral-bg' },
};

export const ACCIONES: Record<AccionDocumento, { label: string; siguiente: EstadoDocumento | null; evento: string }> = {
  emitir: { label: 'Emitir', siguiente: 'emitida', evento: 'Emitida · folio asignado' },
  enviar: { label: 'Enviar al cliente', siguiente: 'enviada', evento: 'Enviada al cliente' },
  reenviar: { label: 'Reenviar', siguiente: null, evento: 'Reenviada al cliente' },
  registrarPago: { label: 'Registrar pago', siguiente: 'pagada', evento: 'Pago registrado' },
  anular: { label: 'Anular', siguiente: 'anulada', evento: 'Anulada' },
};

export const ACCIONES_POR_ESTADO: Record<EstadoDocumento, readonly AccionDocumento[]> = {
  borrador: ['emitir'],
  emitida: ['enviar', 'anular'],
  enviada: ['registrarPago', 'reenviar', 'anular'],
  vencida: ['registrarPago', 'reenviar'],
  pagada: [],
  anulada: [],
};

function toIsoDate(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

function resolverEstado(estado: EstadoDocumento, vencimiento: string, hoy: Date): EstadoDocumento {
  return estado === 'enviada' && toIsoDate(hoy) > vencimiento ? 'vencida' : estado;
}

export function buildNotasCobro(
  centros: Centro[],
  remarcadores: Remarcador[],
  consumoPorRemarcador: Record<string, number>,
  periodo: Date,
  hoy: Date,
  seguimiento: Record<string, SeguimientoDocumento>,
): NotaCobro[] {
  const emision = new Date(periodo.getFullYear(), periodo.getMonth() + 1, 1);
  const vencimiento = toIsoDate(new Date(emision.getFullYear(), emision.getMonth(), emision.getDate() + DIAS_PARA_PAGAR));
  const mes = String(periodo.getMonth() + 1).padStart(2, '0');
  const calculadoEl = new Date(Math.min(emision.getTime(), hoy.getTime())).toISOString();

  return centros.flatMap((centro) => (centro.tarifa ? [{ centro, tarifa: centro.tarifa }] : [])).map(({ centro, tarifa }, index) => {
    const id = `${centro.id}-${periodo.getFullYear()}${mes}`;
    const subtotal = Math.round(centro.balance.ventaKwh * tarifa.ventaClpKwh);
    const neto = subtotal;
    const iva = Math.round(neto * IVA);
    const propio = seguimiento[id];
    return {
      id,
      folio: `NC-${periodo.getFullYear()}-${mes}${String(index + 1).padStart(2, '0')}`,
      centroId: centro.id,
      centroName: centro.name,
      cliente: tarifa.cliente,
      periodo: formatPeriodo(periodo),
      emision: toIsoDate(emision),
      vencimiento,
      lineas: [{ concepto: 'Energía consumida', cantidad: centro.balance.ventaKwh, unidad: 'kWh', precioUnitario: tarifa.ventaClpKwh, subtotal }],
      neto,
      iva,
      total: neto + iva,
      remarcadores: remarcadores
        .filter((remarcador) => remarcador.centroId === centro.id && !remarcador.isPrincipal)
        .map((remarcador) => ({ id: remarcador.id, code: remarcador.code, name: remarcador.name, kwh: consumoPorRemarcador[remarcador.id] ?? 0 }))
        .sort((a, b) => b.kwh - a.kwh),
      estado: resolverEstado(propio?.estado ?? 'borrador', vencimiento, hoy),
      factura: propio?.factura ?? null,
      eventos: [...(propio?.eventos ?? []), { titulo: 'Borrador calculado', fecha: calculadoEl, autor: 'Sistema' }],
    };
  });
}

const ESTADO_FACTURA_POR_NOTA: Record<EstadoDocumento, EstadoDocumento> = {
  borrador: 'emitida',
  emitida: 'emitida',
  enviada: 'enviada',
  vencida: 'vencida',
  pagada: 'pagada',
  anulada: 'anulada',
};

export function listarDocumentos(notas: NotaCobro[]): DocumentoListado[] {
  return notas.flatMap((nota) => {
    const filaNota: DocumentoListado = { id: nota.id, nota, tipo: 'nota', folio: nota.folio, total: nota.total, estado: nota.estado, origen: 'EMS' };
    if (!nota.factura) return [filaNota];
    return [filaNota, {
      id: `${nota.id}:factura`,
      nota,
      tipo: 'factura',
      folio: nota.factura.folio,
      total: nota.factura.monto,
      estado: ESTADO_FACTURA_POR_NOTA[nota.estado],
      origen: nota.factura.origen,
    }];
  });
}

export function diferenciaMontos(nota: NotaCobro): number {
  return nota.factura ? nota.factura.monto - nota.total : 0;
}

export interface Dte {
  folio: string;
  monto: number;
  fecha: string;
}

export function parseDteXml(xml: string): Dte | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return null;
  const text = (tag: string) => doc.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
  const folio = text('Folio');
  const monto = Number(text('MntTotal'));
  if (!folio || !Number.isFinite(monto) || monto <= 0) return null;
  return { folio: `F-${folio}`, monto, fecha: text('FchEmis') };
}

export function validarCargaFactura(input: {
  hasPdf: boolean;
  dte: Dte | null;
  nota: NotaCobro | null;
  foliosExistentes: string[];
  motivo: string;
}): string | null {
  if (!input.hasPdf || !input.dte) return 'Se exigen ambos archivos: el PDF y el XML del documento tributario.';
  if (!input.nota) return 'Elige la nota de cobro a la que corresponde la factura.';
  if (input.foliosExistentes.includes(input.dte.folio)) return `El folio ${input.dte.folio} ya está cargado en la cuenta.`;
  if (input.dte.monto !== input.nota.total && input.motivo.trim() === '') return 'Los montos no coinciden: indica el motivo para vincular igual.';
  return null;
}

function csvCell(value: string | number): string {
  const text = typeof value === 'number' ? formatNumber(value) : value;
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function detalleCsv(notas: NotaCobro[]): string {
  const filas: (string | number)[][] = [['Folio', 'Centro', 'Cliente', 'Período', 'Remarcador', 'kWh', 'Precio unitario', 'Neto nota', 'IVA nota', 'Total nota', 'Estado', 'Factura']];
  for (const nota of notas) {
    const remarcadores = nota.remarcadores.length > 0 ? nota.remarcadores : [{ code: '—', kwh: nota.lineas[0]?.cantidad ?? 0 }];
    for (const remarcador of remarcadores) {
      filas.push([nota.folio, nota.centroName, nota.cliente, nota.periodo, remarcador.code, remarcador.kwh, nota.lineas[0]?.precioUnitario ?? 0, nota.neto, nota.iva, nota.total, ESTADO_DOCUMENTO[nota.estado].label, nota.factura?.folio ?? '']);
    }
  }
  return `﻿${filas.map((fila) => fila.map(csvCell).join(';')).join('\n')}`;
}

export function notaCobroHtml(nota: NotaCobro): string {
  const clp = (n: number) => `$ ${formatNumber(n)}`;
  const anulada = nota.estado === 'anulada' ? '<div class="anulada">ANULADO</div>' : '';
  const lineas = nota.lineas.map((linea) => `<tr><td>${escapeHtml(linea.concepto)}</td><td class="r">${formatNumber(linea.cantidad)} ${escapeHtml(linea.unidad)}</td><td class="r">${clp(linea.precioUnitario)}</td><td class="r">${clp(linea.subtotal)}</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(nota.folio)}</title><style>
body{font-family:Geist,system-ui,sans-serif;margin:40px;color:#0A0E0C}h1{font-size:22px;margin:0}.sub{color:#727C78;font-size:13px;margin-bottom:24px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;font-size:12px}.l{color:#727C78}table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:11px;color:#727C78;padding:8px;border-bottom:2px solid #DDE4E1}td{padding:8px;font-size:13px;border-bottom:1px solid #ECF0EE}
.r{text-align:right;font-family:'Geist Mono',monospace}.anulada{color:#C42722;font-weight:700;border:2px solid #C42722;display:inline-block;padding:4px 12px;margin-bottom:16px}
</style></head><body>${anulada}<h1>Nota de cobro ${escapeHtml(nota.folio)}</h1><div class="sub">POWER Digital® EMS · Globe Power SpA</div>
<div class="meta"><div><div class="l">Cliente</div>${escapeHtml(nota.cliente)}</div><div><div class="l">Centro</div>${escapeHtml(nota.centroName)}</div>
<div><div class="l">Período</div>${escapeHtml(nota.periodo)}</div><div><div class="l">Emisión · vencimiento</div>${nota.emision} · ${nota.vencimiento}</div></div>
<table><thead><tr><th>Concepto</th><th class="r">Cantidad</th><th class="r">Precio unitario</th><th class="r">Subtotal</th></tr></thead><tbody>${lineas}
<tr><td colspan="3" class="r">Neto</td><td class="r">${clp(nota.neto)}</td></tr><tr><td colspan="3" class="r">IVA 19 %</td><td class="r">${clp(nota.iva)}</td></tr>
<tr><td colspan="3" class="r"><b>Total</b></td><td class="r"><b>${clp(nota.total)}</b></td></tr></tbody></table></body></html>`;
}

export function imprimirNota(nota: NotaCobro): void {
  imprimirHtml(notaCobroHtml(nota));
}
