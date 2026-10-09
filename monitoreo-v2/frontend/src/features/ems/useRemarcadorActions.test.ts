import { describe, expect, it } from 'vitest';
import type { Remarcador, RemarcadorEstado } from './fleet';
import { applyRemarcadorOverrides, classifyCentro } from './fleet';
import { planForzarLectura } from './useRemarcadorActions';

const NOW = new Date('2026-10-09T15:00:00Z');

function buildRemarcador(id: string, estado: RemarcadorEstado): Remarcador {
  return {
    id, code: id, name: id, centroId: 'b-1', centroName: 'Alto Peñalolén',
    protocolo: null, fuente: null, idRemarcador: null, ultimaLectura: '2026-07-28T15:00:00Z', potenciaKw: null, estado,
  };
}

describe('planForzarLectura', () => {
  it('reconnects weak-signal meters, keeps downed ones down and skips meters in maintenance', () => {
    const plan = planForzarLectura(
      [buildRemarcador('weak', 'sin_senal'), buildRemarcador('down', 'caido'), buildRemarcador('fixing', 'mantencion')],
      NOW,
    );

    expect(plan).toEqual({
      weak: { estado: 'conectado', ultimaLectura: NOW.toISOString() },
      down: { estado: 'caido', ultimaLectura: NOW.toISOString() },
    });
  });
});

describe('applyRemarcadorOverrides', () => {
  it('returns the centro to operativo once its only downed meter is recovered', () => {
    const fleet = [buildRemarcador('m1', 'caido')];
    const recovered = applyRemarcadorOverrides(fleet, { m1: { estado: 'conectado', ultimaLectura: NOW.toISOString() } });

    expect(classifyCentro(fleet.map((r) => r.estado))).toBe('alarma');
    expect(classifyCentro(recovered.map((r) => r.estado))).toBe('operativo');
  });
});
