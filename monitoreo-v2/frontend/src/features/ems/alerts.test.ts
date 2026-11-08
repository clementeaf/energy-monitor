import { describe, expect, it } from 'vitest';
import { buildAlertas, buildAlertasMargen } from './alerts';
import type { Centro, Remarcador, RemarcadorEstado } from './fleet';

function buildRemarcador(id: string, estado: RemarcadorEstado): Remarcador {
  return {
    id, code: id.toUpperCase(), name: id, centroId: 'b-1', centroName: 'Alto Peñalolén',
    protocolo: null, fuente: null, idRemarcador: null, ultimaLectura: null, potenciaKw: null, estado,
  };
}

describe('buildAlertas', () => {
  it('raises a critical alert per downed meter and a warning per weak signal, none for connected ones', () => {
    const alertas = buildAlertas([
      buildRemarcador('m1', 'caido'),
      buildRemarcador('m2', 'sin_senal'),
      buildRemarcador('m3', 'conectado'),
    ]);

    expect(alertas.map((alerta) => [alerta.id, alerta.severidad, alerta.href])).toEqual([
      ['auto-m1', 'critica', '/remarcadores/m1'],
      ['auto-m2', 'advertencia', '/remarcadores/m2'],
    ]);
    expect(alertas[0].titulo).toBe('Remarcador M1 sin conexión');
  });
});

describe('buildAlertasMargen', () => {
  it('raises an alarm per centro whose margin falls under the contractual minimum', () => {
    const centro = (id: string, margenPct: number | null) => ({ id, name: id, margen: margenPct === null ? null : { margenPct } }) as Centro;
    const alertas = buildAlertasMargen([centro('a', 7.4), centro('b', 15), centro('c', null)], 10, new Date('2026-11-01T00:00:00Z'));
    expect(alertas.map((alerta) => [alerta.id, alerta.severidad, alerta.href])).toEqual([['margen-a', 'critica', '/centros/a']]);
  });
});
