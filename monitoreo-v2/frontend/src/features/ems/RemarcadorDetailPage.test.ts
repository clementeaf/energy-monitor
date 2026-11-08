import { describe, expect, it } from 'vitest';
import type { Reading } from '../../types/reading';
import { construirTramos } from './RemarcadorDetailPage';

const HASTA = Date.parse('2026-11-06T12:00:00Z');
const lectura = (iso: string, kw: string) => ({ timestamp: iso, power_kw: kw }) as Reading;

describe('construirTramos', () => {
  it('splits the window into fixed slots and marks missing slots as null, never zero', () => {
    const tramos = construirTramos([lectura('2026-11-06T11:30:00Z', '10'), lectura('2026-11-06T11:35:00Z', '20'), lectura('2026-11-06T12:00:00Z', '0')], HASTA, 1, 15);

    expect(tramos).toHaveLength(4);
    expect(tramos.map((t) => t.kw)).toEqual([null, 15, null, 0]);
    expect(tramos[1].lectura?.timestamp).toBe('2026-11-06T11:35:00Z');
  });
});
