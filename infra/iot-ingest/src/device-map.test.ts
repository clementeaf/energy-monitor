import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveDevice, refreshDeviceMap, _resetCache } from './device-map';

describe('resolveDevice', () => {
  beforeEach(() => {
    _resetCache();
  });

  afterEach(() => {
    delete process.env.DEVICE_MAP;
    _resetCache();
  });

  it('returns null when no map loaded and no env var', () => {
    expect(resolveDevice('anything')).toBeNull();
  });

  it('resolves device from DEVICE_MAP env var', () => {
    process.env.DEVICE_MAP = JSON.stringify({
      'siemens-poc3000': { tenantId: 'tenant-a', meterId: 'meter-a' },
    });
    _resetCache();

    expect(resolveDevice('siemens-poc3000')).toEqual({
      tenantId: 'tenant-a',
      meterId: 'meter-a',
    });
  });

  it('returns null for unknown device with env var set', () => {
    process.env.DEVICE_MAP = JSON.stringify({
      'known-device': { tenantId: 't', meterId: 'm' },
    });
    _resetCache();

    expect(resolveDevice('unknown-device')).toBeNull();
  });

  it('falls back to empty map on invalid DEVICE_MAP JSON', () => {
    process.env.DEVICE_MAP = 'not-valid-json';
    _resetCache();

    expect(resolveDevice('anything')).toBeNull();
  });
});

describe('refreshDeviceMap', () => {
  beforeEach(() => {
    _resetCache();
  });

  afterEach(() => {
    delete process.env.DEVICE_MAP;
    _resetCache();
  });

  it('loads device map from DB client and merges with env', async () => {
    process.env.DEVICE_MAP = JSON.stringify({
      'env-device': { tenantId: 'env-tenant', meterId: 'env-meter' },
    });

    // Mock pg Client with query result
    const mockDb = {
      query: async () => ({
        rows: [
          { iot_device_id: 'db-device-1', meter_id: 'meter-1', tenant_id: 'tenant-1' },
          { iot_device_id: 'db-device-2', meter_id: 'meter-2', tenant_id: 'tenant-2' },
        ],
      }),
    } as any;

    await refreshDeviceMap(mockDb);

    // DB entries
    expect(resolveDevice('db-device-1')).toEqual({ tenantId: 'tenant-1', meterId: 'meter-1' });
    expect(resolveDevice('db-device-2')).toEqual({ tenantId: 'tenant-2', meterId: 'meter-2' });
    // Env entries merged
    expect(resolveDevice('env-device')).toEqual({ tenantId: 'env-tenant', meterId: 'env-meter' });
    // Unknown still null
    expect(resolveDevice('unknown')).toBeNull();
  });

  it('env var overrides DB entry with same key', async () => {
    process.env.DEVICE_MAP = JSON.stringify({
      'shared-key': { tenantId: 'env-tenant', meterId: 'env-meter' },
    });

    const mockDb = {
      query: async () => ({
        rows: [{ iot_device_id: 'shared-key', meter_id: 'db-meter', tenant_id: 'db-tenant' }],
      }),
    } as any;

    await refreshDeviceMap(mockDb);

    // env wins over DB (emergency override)
    expect(resolveDevice('shared-key')).toEqual({ tenantId: 'env-tenant', meterId: 'env-meter' });
  });

  it('falls back to env var when DB query throws', async () => {
    process.env.DEVICE_MAP = JSON.stringify({
      'fallback-device': { tenantId: 't', meterId: 'm' },
    });

    const mockDb = {
      query: async () => { throw new Error('connection refused'); },
    } as any;

    await refreshDeviceMap(mockDb);

    expect(resolveDevice('fallback-device')).toEqual({ tenantId: 't', meterId: 'm' });
  });
});
