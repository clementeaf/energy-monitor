import { describe, expect, it } from 'vitest';
import type { Centro } from './fleet';
import { buildFacturas } from './FacturasPage';
import { calcularMargen, TARIFAS_POR_CENTRO } from './tariffs';

function buildCentro(overrides: Partial<Centro>): Centro {
  const tarifa = TARIFAS_POR_CENTRO['VE-QUILICURA'];
  return {
    id: 'b-1', name: 'Quilicura', code: 'VE-QUILICURA', address: null, superficie: null, consumoMesKwh: 2000,
    intensidadKwhM2: null, remarcadores: 1, estado: 'operativo', tarifa, margen: calcularMargen(2000, tarifa), ...overrides,
  };
}

describe('buildFacturas', () => {
  it('bills the period sale with VAT, due 30 days after issue, and skips centros without tariff', () => {
    const julio = new Date(2026, 6, 1);
    const facturas = buildFacturas([buildCentro({}), buildCentro({ id: 'b-2', tarifa: null, margen: null })], julio, new Date(2026, 7, 15));

    expect(facturas).toHaveLength(1);
    expect(facturas[0]).toMatchObject({ numero: 'FE-2026-0701', emision: '2026-08-01', vencimiento: '2026-08-31', neto: 250_000, iva: 47_500, total: 297_500, estado: 'pendiente' });
    expect(buildFacturas([buildCentro({})], julio, new Date(2026, 9, 9))[0].estado).toBe('vencida');
  });
});
