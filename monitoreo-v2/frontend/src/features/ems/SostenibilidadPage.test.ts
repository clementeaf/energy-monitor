import { describe, expect, it } from 'vitest';
import { resumirMedidas } from './SostenibilidadPage';

const RECOS = [
  { id: 'a', titulo: '', detalle: '', ahorroMillones: 2.1, co2Toneladas: 8.4, stripeClass: '' },
  { id: 'b', titulo: '', detalle: '', ahorroMillones: 1.3, co2Toneladas: 4.1, stripeClass: '' },
];

describe('resumirMedidas', () => {
  it('moves savings from pending to committed and raises efficiency per applied measure', () => {
    const resumen = resumirMedidas(RECOS, new Set(['a']));

    expect(resumen.ahorroPendiente).toBeCloseTo(1.3);
    expect(resumen.ahorroComprometido).toBeCloseTo(2.1);
    expect(resumen.co2Reducido).toBeCloseTo(8.4);
    expect(resumen.eficiencia).toBeCloseTo(84.5);
  });
});
