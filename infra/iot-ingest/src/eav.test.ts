import { describe, it, expect } from 'vitest';
import { toEavRows } from './eav';
import type { ParsedReading, DeviceIdentity } from './types';

describe('toEavRows', () => {
  const identity: DeviceIdentity = {
    tenantId: 'tenant-1',
    meterId: 'meter-1',
  };

  it('produces one row per variable', () => {
    const reading: ParsedReading = {
      deviceId: 'dev-1',
      timestamp: '2026-06-01T10:00:00Z',
      variables: new Map([
        ['voltage_l1', 220.5],
        ['current_l1', 15.2],
        ['power_factor', 0.95],
      ]),
    };

    const rows = toEavRows(reading, identity);
    expect(rows).toHaveLength(3);

    const voltageRow = rows.find((r) => r.variableName === 'voltage_l1')!;
    expect(voltageRow.time).toBe('2026-06-01T10:00:00Z');
    expect(voltageRow.tenantId).toBe('tenant-1');
    expect(voltageRow.meterId).toBe('meter-1');
    expect(voltageRow.value).toBe(220.5);
    expect(voltageRow.quality).toBe(0);
  });

  it('returns empty array for reading with no variables', () => {
    const reading: ParsedReading = {
      deviceId: 'dev-1',
      timestamp: '2026-06-01T10:00:00Z',
      variables: new Map(),
    };
    expect(toEavRows(reading, identity)).toHaveLength(0);
  });

  it('preserves all fields across every row', () => {
    const reading: ParsedReading = {
      deviceId: 'dev-1',
      timestamp: '2026-01-01T00:00:00Z',
      variables: new Map([['voltage_l1', 1], ['voltage_l2', 2]]),
    };
    const rows = toEavRows(reading, identity);
    for (const row of rows) {
      expect(row.time).toBe('2026-01-01T00:00:00Z');
      expect(row.tenantId).toBe('tenant-1');
      expect(row.meterId).toBe('meter-1');
      expect(row.quality).toBe(0);
    }
  });
});
