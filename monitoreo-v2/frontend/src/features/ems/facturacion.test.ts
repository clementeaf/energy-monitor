import { describe, expect, it } from 'vitest';
import type { Centro, Remarcador } from './fleet';
import { ACCIONES_POR_ESTADO, buildNotasCobro, detalleCsv, listarDocumentos, notaCobroHtml, parseDteXml, validarCargaFactura, type FacturaVinculada } from './facturacion';
import { calcularMargen, TARIFAS_POR_CENTRO } from './tariffs';

const TARIFA = TARIFAS_POR_CENTRO['VE-QUILICURA'];

function buildCentro(overrides: Partial<Centro> = {}): Centro {
  return {
    id: 'b-1', name: 'Quilicura', code: 'VE-QUILICURA', address: null, superficie: null, consumoMesKwh: 2000,
    intensidadKwhM2: null, remarcadores: 2, estado: 'operativo', tarifa: TARIFA, margen: calcularMargen(2000, TARIFA), ...overrides,
  };
}

function buildRemarcador(id: string, centroId = 'b-1'): Remarcador {
  return { id, code: `VE-QUILICURA-${id}`, name: `Remarcador ${id}`, centroId, centroName: 'Quilicura', protocolo: null, fuente: null, idRemarcador: id, ultimaLectura: null, potenciaKw: null, estado: 'conectado' };
}

const JULIO = new Date(2026, 6, 1);
const FACTURA: FacturaVinculada = { folio: 'F-18467', fecha: '2026-08-02', monto: 297_500, origen: 'Manual', motivoDiferencia: null };

describe('buildNotasCobro', () => {
  it('bills each tariffed centro with VAT, due 30 days after issue, as a draft', () => {
    const [nota, ...rest] = buildNotasCobro([buildCentro(), buildCentro({ id: 'b-2', tarifa: null, margen: null })], [], {}, JULIO, new Date(2026, 7, 15), {});

    expect(rest).toHaveLength(0);
    expect(nota).toMatchObject({ folio: 'NC-2026-0701', emision: '2026-08-01', vencimiento: '2026-08-31', neto: 250_000, iva: 47_500, total: 297_500, estado: 'borrador' });
    expect(nota.lineas).toEqual([{ concepto: 'Energía consumida', cantidad: 2000, unidad: 'kWh', precioUnitario: 125, subtotal: 250_000 }]);
  });

  it('traces the charge to each meter of the centro, highest consumption first', () => {
    const [nota] = buildNotasCobro([buildCentro()], [buildRemarcador('m1'), buildRemarcador('m2'), buildRemarcador('x', 'b-9')], { m1: 800, m2: 1200 }, JULIO, JULIO, {});
    expect(nota.remarcadores.map((r) => [r.id, r.kwh])).toEqual([['m2', 1200], ['m1', 800]]);
  });

  it('turns a sent note past its due date into vencida and keeps tracked state', () => {
    const seguimiento = { 'b-1-202607': { estado: 'enviada' as const, eventos: [{ titulo: 'Enviada al cliente', fecha: '2026-08-02T12:00:00Z', autor: 'Ana' }] } };
    expect(buildNotasCobro([buildCentro()], [], {}, JULIO, new Date(2026, 8, 1), seguimiento)[0].estado).toBe('vencida');
    expect(buildNotasCobro([buildCentro()], [], {}, JULIO, new Date(2026, 7, 20), seguimiento)[0].estado).toBe('enviada');
  });
});

describe('document lifecycle', () => {
  it('only lets drafts be issued and never acts on paid or voided documents', () => {
    expect(ACCIONES_POR_ESTADO.borrador).toEqual(['emitir']);
    expect(ACCIONES_POR_ESTADO.pagada).toEqual([]);
    expect(ACCIONES_POR_ESTADO.anulada).toEqual([]);
    expect(ACCIONES_POR_ESTADO.vencida).not.toContain('anular');
  });

  it('lists a linked invoice next to its note with its own origin', () => {
    const [nota] = buildNotasCobro([buildCentro()], [], {}, JULIO, JULIO, { 'b-1-202607': { factura: FACTURA, eventos: [] } });
    expect(listarDocumentos([nota]).map((doc) => [doc.tipo, doc.folio, doc.origen])).toEqual([['nota', 'NC-2026-0701', 'EMS'], ['factura', 'F-18467', 'Manual']]);
  });
});

describe('manual invoice upload', () => {
  const [nota] = buildNotasCobro([buildCentro()], [], {}, JULIO, JULIO, {});
  const dte = parseDteXml('<DTE><Documento><Encabezado><IdDoc><Folio>18467</Folio><FchEmis>2026-08-02</FchEmis></IdDoc><Totales><MntTotal>297500</MntTotal></Totales></Encabezado></Documento></DTE>');

  it('reads folio, total and date from the SII XML and rejects malformed XML', () => {
    expect(dte).toEqual({ folio: 'F-18467', monto: 297_500, fecha: '2026-08-02' });
    expect(parseDteXml('<DTE><Folio>1</Folio>')).toBeNull();
  });

  it('requires both files, a note, a unique folio and a reason when amounts differ', () => {
    const base = { hasPdf: true, dte, nota, foliosExistentes: [], motivo: '' };
    expect(validarCargaFactura(base)).toBeNull();
    expect(validarCargaFactura({ ...base, hasPdf: false })).toMatch(/ambos archivos/);
    expect(validarCargaFactura({ ...base, nota: null })).toMatch(/nota de cobro/);
    expect(validarCargaFactura({ ...base, foliosExistentes: ['F-18467'] })).toMatch(/ya está cargado/);
    expect(validarCargaFactura({ ...base, dte: dte && { ...dte, monto: 300_000 } })).toMatch(/motivo/);
    expect(validarCargaFactura({ ...base, dte: dte && { ...dte, monto: 300_000 }, motivo: 'Ajuste de tarifa' })).toBeNull();
  });
});

describe('exports', () => {
  it('writes one CSV row per meter and escapes HTML in the printable note', () => {
    const [nota] = buildNotasCobro([buildCentro({ name: '<b>Centro;"X"</b>' })], [buildRemarcador('m1')], { m1: 2000 }, JULIO, JULIO, {});
    const csv = detalleCsv([nota]).split('\n');
    expect(csv).toHaveLength(2);
    expect(csv[1]).toContain('"<b>Centro;""X""</b>"');
    expect(notaCobroHtml(nota)).not.toContain('<b>Centro');
  });
});
