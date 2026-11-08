import { describe, expect, it } from 'vitest';
import { estadoMargen } from './MargenesPage';

describe('estadoMargen', () => {
  it('flags under the minimum, watches the next 7 points and clears the rest', () => {
    expect([7.4, 10, 16.9, 17].map((pct) => estadoMargen(pct, 10))).toEqual(['bajo', 'observacion', 'observacion', 'sobre']);
  });
});
