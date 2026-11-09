import { describe, expect, it } from 'vitest';
import { comparablesEntre, desplazarMeses, etiquetaTramo, etiquetaPeriodo, periodoAnterior, periodoQueContiene, periodosHasta, tramoEquivalente, variacionPct } from './periodos';

describe('periodos', () => {
  it('compares an in-progress month against the same elapsed stretch of the previous one', () => {
    const noviembre = periodoQueContiene('mes', new Date(2026, 10, 8));
    const octubre = periodoAnterior(noviembre);
    const tramo = tramoEquivalente(octubre, noviembre, new Date(2026, 10, 8, 12));
    expect(tramo).toEqual({ desde: new Date(2026, 9, 1), hasta: new Date(2026, 9, 8, 12) });
  });

  it('compares a closed period in full', () => {
    const octubre = periodoQueContiene('mes', new Date(2026, 9, 15));
    const septiembre = periodoAnterior(octubre);
    expect(tramoEquivalente(septiembre, octubre, new Date(2026, 10, 8))).toEqual(septiembre);
  });

  it('labels quarters and years and clamps month shifts to the last day', () => {
    expect(etiquetaPeriodo(periodoQueContiene('trimestre', new Date(2026, 10, 8)))).toBe('T4 2026');
    expect(etiquetaPeriodo(periodoAnterior(periodoQueContiene('anio', new Date(2026, 10, 8))))).toBe('2025');
    expect(desplazarMeses(new Date(2026, 2, 31), -1)).toEqual(new Date(2026, 1, 28));
  });

  it('returns no variation when the comparison has no data', () => {
    expect(variacionPct(110, 100)).toBeCloseTo(10);
    expect(variacionPct(110, 0)).toBeNull();
    expect(variacionPct(110, null)).toBeNull();
  });

  it('lists periods from the current one back to the start of the history', () => {
    const vigente = periodoQueContiene('trimestre', new Date(2026, 10, 9));
    expect(periodosHasta(vigente, new Date(2025, 0, 1)).map(etiquetaPeriodo)).toEqual(['T4 2026', 'T3 2026', 'T2 2026', 'T1 2026', 'T4 2025', 'T3 2025', 'T2 2025', 'T1 2025']);
    expect(periodosHasta(periodoQueContiene('anio', new Date(2026, 10, 9)), new Date(2025, 0, 1)).map(etiquetaPeriodo)).toEqual(['2026', '2025']);
  });

  it('compares only centros with data in both periods and reports the newcomers', () => {
    const actuales = [{ id: 'altopena', kwh: 90 }, { id: 'dehesa', kwh: 40 }, { id: 'renaissance', kwh: 0 }];
    const previos = [{ id: 'altopena', kwh: 80 }, { id: 'renaissance', kwh: 5 }];
    const { actuales: a, previos: p, excluidos } = comparablesEntre(actuales, previos, (c) => c.kwh);
    expect(a.map((c) => c.id)).toEqual(['altopena']);
    expect(p.map((c) => c.id)).toEqual(['altopena']);
    expect(excluidos.map((c) => c.id)).toEqual(['dehesa']);
  });

  it('shows the year in a stretch label only when it is not the current year', () => {
    const ahora = new Date(2026, 10, 9);
    expect(etiquetaTramo({ desde: new Date(2026, 9, 10), hasta: new Date(2026, 10, 10) }, ahora)).toBe('10 oct – 9 nov');
    expect(etiquetaTramo({ desde: new Date(2025, 9, 10), hasta: new Date(2025, 10, 10) }, ahora)).toBe('10 oct – 9 nov 2025');
    expect(etiquetaTramo({ desde: new Date(2025, 11, 20), hasta: new Date(2026, 0, 10) }, ahora)).toBe('20 dic 2025 – 9 ene 2026');
  });
});
