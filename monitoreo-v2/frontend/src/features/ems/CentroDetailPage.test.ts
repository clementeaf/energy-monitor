import { describe, expect, it } from 'vitest';
import { serieDiaria } from './CentroDetailPage';

describe('serieDiaria', () => {
  const points = [{ timestamp: '2026-11-01T03:00:00Z', kw: 10 }];

  it('turns daily average demand into energy and purchase cost', () => {
    expect(serieDiaria(points, 'demanda', 112)[0].kw).toBe(10);
    expect(serieDiaria(points, 'consumo', 112)[0].kw).toBe(240);
    expect(serieDiaria(points, 'costo', 112)[0].kw).toBe(26_880);
  });
});
