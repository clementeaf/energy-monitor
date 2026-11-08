import { describe, expect, it, vi } from 'vitest';
import type { Meter } from '../../types/meter';
import { metersEndpoints } from '../../services/endpoints';
import { fetchAllMeters } from './useMetersQuery';

vi.mock('../../services/endpoints', () => ({ metersEndpoints: { list: vi.fn() } }));

const meters = (count: number, from = 0) => Array.from({ length: count }, (_, i) => ({ id: `m${from + i}` }) as Meter);

describe('fetchAllMeters', () => {
  it('follows offset pages until the API total is reached', async () => {
    const list = vi.mocked(metersEndpoints.list);
    list.mockImplementation(async (_buildingId, offset = 0) => ({ data: { data: meters(Math.min(200, 336 - offset), offset), total: 336 } }) as never);

    const result = await fetchAllMeters();

    expect(result).toHaveLength(336);
    expect(list.mock.calls.map(([, offset]) => offset)).toEqual([0, 200]);
  });
});
