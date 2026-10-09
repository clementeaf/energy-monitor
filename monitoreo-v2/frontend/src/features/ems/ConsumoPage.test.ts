import { describe, expect, it } from 'vitest';
import { toggleComparacion } from './ConsumoPage';

describe('toggleComparacion', () => {
  it('keeps at most two centros, dropping the oldest', () => {
    expect(toggleComparacion(['a', 'b'], 'c')).toEqual(['b', 'c']);
  });

  it('removes a centro but never leaves the comparison empty', () => {
    expect(toggleComparacion(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleComparacion(['b'], 'b')).toEqual(['b']);
  });
});
