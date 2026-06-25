import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveDevice, _resetCache } from './device-map';

describe('resolveDevice', () => {
  beforeEach(() => {
    _resetCache();
  });

  afterEach(() => {
    delete process.env.DEVICE_MAP;
    _resetCache();
  });

  it('resolves known device from default map', () => {
    const identity = resolveDevice('6ab27db7-0a61-40c2-8a93-35e9e2376683');
    expect(identity).toEqual({
      tenantId: '84adf8d4-830d-46e1-bef5-e2eac6a19014',
      meterId: '6ab27db7-0a61-40c2-8a93-35e9e2376683',
    });
  });

  it('returns null for unknown device', () => {
    expect(resolveDevice('unknown-device-id')).toBeNull();
  });

  it('merges DEVICE_MAP env override with defaults', () => {
    process.env.DEVICE_MAP = JSON.stringify({
      'new-device-1': { tenantId: 'tenant-a', meterId: 'meter-a' },
    });
    _resetCache();

    expect(resolveDevice('new-device-1')).toEqual({
      tenantId: 'tenant-a',
      meterId: 'meter-a',
    });
    // Default still available
    expect(resolveDevice('6ab27db7-0a61-40c2-8a93-35e9e2376683')).not.toBeNull();
  });

  it('falls back to defaults on invalid DEVICE_MAP JSON', () => {
    process.env.DEVICE_MAP = 'not-valid-json';
    _resetCache();

    expect(resolveDevice('6ab27db7-0a61-40c2-8a93-35e9e2376683')).not.toBeNull();
  });
});
