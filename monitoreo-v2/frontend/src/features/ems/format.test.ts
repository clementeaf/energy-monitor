import { describe, expect, it } from 'vitest';
import { inicialesDe } from './format';

describe('inicialesDe', () => {
  it('takes the first letter of the first two names and falls back for blank input', () => {
    expect(inicialesDe('ana ríos tapia')).toBe('AR');
    expect(inicialesDe('  Clemente ')).toBe('C');
    expect(inicialesDe('')).toBe('?');
    expect(inicialesDe('Ejecutivo / Visualización')).toBe('EV');
  });
});
