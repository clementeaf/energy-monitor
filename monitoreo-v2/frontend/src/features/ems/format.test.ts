import { describe, expect, it } from 'vitest';
import { formatDateTime, formatFecha, inicialesDe } from './format';

describe('inicialesDe', () => {
  it('takes the first letter of the first two names and falls back for blank input', () => {
    expect(inicialesDe('ana ríos tapia')).toBe('AR');
    expect(inicialesDe('  Clemente ')).toBe('C');
    expect(inicialesDe('')).toBe('?');
    expect(inicialesDe('Ejecutivo / Visualización')).toBe('EV');
  });
});

describe('formatFecha', () => {
  it('formats a calendar date without shifting it across time zones', () => {
    expect(formatFecha('2026-12-31')).toBe('31 dic 2026');
    expect(formatFecha('2026-12-01')).toBe('01 dic 2026');
  });
});

describe('formatDateTime', () => {
  it('shows only the 24 h time for readings from today and adds the date otherwise', () => {
    const now = new Date(2026, 10, 8, 19, 30);
    expect(formatDateTime(new Date(2026, 10, 8, 12, 45, 30).toISOString(), now)).toBe('12:45:30');
    expect(formatDateTime(new Date(2026, 10, 7, 9, 5).toISOString(), now)).toMatch(/^0?7[-/]11.*09:05$/);
    expect(formatDateTime(null, now)).toBe('—');
  });
});
