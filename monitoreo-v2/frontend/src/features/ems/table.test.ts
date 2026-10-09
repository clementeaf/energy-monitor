import { describe, expect, it } from 'vitest';
import { nextSort, sortRows } from './table';

const ROWS = [
  { name: 'Ñuñoa', kwh: 20 },
  { name: 'Alto Peñalolén', kwh: 5 },
  { name: 'Quilicura', kwh: 12 },
];
const GETTERS = { name: (row: typeof ROWS[number]) => row.name, kwh: (row: typeof ROWS[number]) => row.kwh };

describe('sortRows', () => {
  it('sorts numbers descending and Spanish text ascending', () => {
    expect(sortRows(ROWS, { key: 'kwh', direction: 'desc' }, GETTERS).map((r) => r.kwh)).toEqual([20, 12, 5]);
    expect(sortRows(ROWS, { key: 'name', direction: 'asc' }, GETTERS).map((r) => r.name)).toEqual(['Alto Peñalolén', 'Ñuñoa', 'Quilicura']);
  });
});

describe('nextSort', () => {
  it('flips direction on the same column and starts a new column descending', () => {
    expect(nextSort({ key: 'kwh', direction: 'desc' }, 'kwh')).toEqual({ key: 'kwh', direction: 'asc' });
    expect(nextSort({ key: 'kwh', direction: 'asc' }, 'name')).toEqual({ key: 'name', direction: 'desc' });
  });
});
