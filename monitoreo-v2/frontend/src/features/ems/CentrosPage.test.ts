import { describe, expect, it } from 'vitest';
import type { Centro, Remarcador } from './fleet';
import { pctEnLinea, tonoLecturas } from './CentrosPage';

const centro = { id: 'b-1' } as Centro;
const remarcador = (estado: Remarcador['estado'], centroId = 'b-1') => ({ centroId, estado }) as Remarcador;

describe('Centro card health bar', () => {
  it('counts only the centro own meters that are online', () => {
    expect(pctEnLinea(centro, [remarcador('conectado'), remarcador('caido'), remarcador('caido', 'b-2')])).toBe(50);
    expect(pctEnLinea(centro, [])).toBe(0);
  });

  it('colors by threshold: lime from 80 %, amber from 40 %, red below', () => {
    expect([80, 79, 40, 39].map(tonoLecturas)).toEqual(['bg-accent', 'bg-warning', 'bg-warning', 'bg-danger']);
  });
});
