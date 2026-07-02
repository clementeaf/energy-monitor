import { describe, it, expect, vi } from 'vitest';
import { registerUnknownDevice } from './handler';

describe('registerUnknownDevice', () => {
  it('upserts device with JSON payload sample', async () => {
    const mockDb = { query: vi.fn().mockResolvedValue({ rowCount: 1 }) } as any;
    const payload = { voltajeL1N_V: 220, corrienteL1_A: 1.5 };

    await registerUnknownDevice(mockDb, 'thing-001', payload);

    expect(mockDb.query).toHaveBeenCalledOnce();
    const [sql, params] = mockDb.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO iot_devices');
    expect(sql).toContain('ON CONFLICT (device_client_id) DO UPDATE');
    expect(params[0]).toBe('thing-001');
    expect(JSON.parse(params[1])).toEqual(payload);
  });

  it('uses empty JSON when payload is not an object', async () => {
    const mockDb = { query: vi.fn().mockResolvedValue({ rowCount: 1 }) } as any;

    await registerUnknownDevice(mockDb, 'thing-002', 'not-an-object');

    const [, params] = mockDb.query.mock.calls[0];
    expect(params[1]).toBe('{}');
  });

  it('uses empty JSON when payload is null', async () => {
    const mockDb = { query: vi.fn().mockResolvedValue({ rowCount: 1 }) } as any;

    await registerUnknownDevice(mockDb, 'thing-003', null);

    const [, params] = mockDb.query.mock.calls[0];
    expect(params[1]).toBe('{}');
  });
});
