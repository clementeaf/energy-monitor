import { describe, expect, it } from 'vitest';
import type { AggregatedReading } from '../../types/reading';
import { desplazarMeses, etiquetaPeriodo, periodoAnterior, periodoQueContiene, periodosDisponibles, tramoEquivalente, variacionPct } from './periodos';

const fila = (bucket: string, kwh: string): AggregatedReading => ({
  bucket, meter_id: 'm1', avg_power_kw: null, max_power_kw: null, min_power_kw: null, avg_power_factor: null, avg_voltage_l1: null, energy_delta_kwh: kwh, reading_count: '1',
});

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

  it('offers only periods with energy whose previous period is inside the loaded history', () => {
    const filas = [fila('2025-01-01T00:00:00.000Z', '5'), fila('2025-02-01T00:00:00.000Z', '0'), fila('2025-03-01T00:00:00.000Z', '7')];
    const meses = periodosDisponibles(filas, 'mes', new Date(2025, 0, 1)).map(etiquetaPeriodo);
    expect(meses).toEqual(['Marzo 2025']);
  });
});
