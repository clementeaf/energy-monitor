import { describe, expect, it } from 'vitest';
import { esPunta, participacionPunta, perfilHorario } from './ConsumoPage';

const at = (hour: number, kw: number) => ({ timestamp: new Date(2026, 10, 6, hour).toISOString(), kw });

describe('perfil horario', () => {
  it('averages demand by hour of day and leaves hours without data empty', () => {
    const perfil = perfilHorario([at(18, 10), at(18, 20), at(3, 5)]);
    expect(perfil[18]).toBe(15);
    expect(perfil[3]).toBe(5);
    expect(perfil[4]).toBeNull();
  });

  it('treats 18 to 22 h as peak and measures its share of demand', () => {
    expect([17, 18, 21, 22].map(esPunta)).toEqual([false, true, true, false]);
    expect(participacionPunta(perfilHorario([at(18, 30), at(10, 70)]))).toBe(30);
  });
});
