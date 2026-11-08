import { describe, expect, it } from 'vitest';
import { puedeCerrar } from './TerrenoPage';

describe('puedeCerrar', () => {
  it('requires every checklist step, including a valid forced reading, before closing', () => {
    const tarea = { asignadaEn: '2026-11-06T12:45:00Z', isUrgente: true, checklist: [true, true, true, false] };
    expect(puedeCerrar(tarea)).toBe(false);
    expect(puedeCerrar({ ...tarea, checklist: [true, true, true, true] })).toBe(true);
  });
});
