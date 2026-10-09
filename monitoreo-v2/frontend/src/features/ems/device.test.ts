import { describe, expect, it } from 'vitest';
import { buildFichaDispositivo } from './device';

describe('buildFichaDispositivo', () => {
  it('gives each meter a stable spec and a signal consistent with its connection state', () => {
    const conectado = buildFichaDispositivo({ id: 'eae040d3-ab1c-49d0-8090-2c867a22c05b', estado: 'conectado' });

    expect(buildFichaDispositivo({ id: 'eae040d3-ab1c-49d0-8090-2c867a22c05b', estado: 'conectado' })).toEqual(conectado);
    expect(conectado.senalPct).toBeGreaterThanOrEqual(70);
    expect(conectado.alta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(buildFichaDispositivo({ id: 'eae040d3-ab1c-49d0-8090-2c867a22c05b', estado: 'sin_senal' }).senalPct).toBeLessThan(40);
    expect(buildFichaDispositivo({ id: 'eae040d3-ab1c-49d0-8090-2c867a22c05b', estado: 'caido' }).senalPct).toBe(0);
  });
});
