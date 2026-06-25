import type { DeviceIdentity } from './types';

/**
 * Maps external device IDs to internal tenant + meter UUIDs.
 *
 * Update this map when new devices are provisioned.
 * Keys: device_id as reported by the IoT device (e.g. POC3000 item_id).
 * Values: { tenantId, meterId } from monitoreo-v2 DB.
 *
 * ponytail: env-var override available for runtime patching without redeploy.
 * Format: JSON string of Record<string, { tenantId, meterId }>.
 */
const DEFAULT_MAP: Readonly<Record<string, DeviceIdentity>> = {
  // Siemens POC3000 — Siemens tenant
  '6ab27db7-0a61-40c2-8a93-35e9e2376683': {
    tenantId: '84adf8d4-830d-46e1-bef5-e2eac6a19014',
    meterId: '6ab27db7-0a61-40c2-8a93-35e9e2376683',
  },
};

const loadDeviceMap = (): Readonly<Record<string, DeviceIdentity>> => {
  const envOverride = process.env.DEVICE_MAP;
  if (!envOverride) return DEFAULT_MAP;

  try {
    const parsed = JSON.parse(envOverride) as Record<string, DeviceIdentity>;
    return { ...DEFAULT_MAP, ...parsed };
  } catch {
    return DEFAULT_MAP;
  }
};

let cached: Readonly<Record<string, DeviceIdentity>> | undefined;

export const getDeviceMap = (): Readonly<Record<string, DeviceIdentity>> => {
  cached ??= loadDeviceMap();
  return cached;
};

export const resolveDevice = (deviceId: string): DeviceIdentity | null =>
  getDeviceMap()[deviceId] ?? null;

/** Reset cache — for testing only. */
export const _resetCache = (): void => {
  cached = undefined;
};
