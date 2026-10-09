import { describe, expect, it } from 'vitest';
import { buildAlertas } from './alerts';
import type { Remarcador, RemarcadorEstado } from './fleet';

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

    expect(alertas.map((alerta) => [alerta.id, alerta.severidad, alerta.remarcadorId])).toEqual([
      ['auto-m1', 'critica', 'm1'],
      ['auto-m2', 'advertencia', 'm2'],
    ]);
    expect(alertas[0].titulo).toBe('Remarcador M1 sin conexión');
  });
});
