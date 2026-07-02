import type { Client } from 'pg';
import type { DeviceIdentity } from './types';

/**
 * Builds device map from DB (meters.iot_device_id).
 * Falls back to DEVICE_MAP env var if DB query fails.
 *
 * ponytail: DB is source of truth, env var is emergency fallback only.
 */

let cached: Readonly<Record<string, DeviceIdentity>> | undefined;

const loadFromEnv = (): Record<string, DeviceIdentity> => {
  const raw = process.env.DEVICE_MAP;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, DeviceIdentity>;
  } catch {
    return {};
  }
};

export const loadDeviceMapFromDb = async (db: Client): Promise<Record<string, DeviceIdentity>> => {
  const result = await db.query(
    `SELECT iot_device_id, id AS meter_id, tenant_id FROM meters WHERE iot_device_id IS NOT NULL`,
  );
  const map: Record<string, DeviceIdentity> = {};
  for (const row of result.rows) {
    map[row.iot_device_id] = { tenantId: row.tenant_id, meterId: row.meter_id };
  }
  return map;
};

export const refreshDeviceMap = async (db: Client): Promise<void> => {
  try {
    const dbMap = await loadDeviceMapFromDb(db);
    const envMap = loadFromEnv();
    cached = { ...dbMap, ...envMap };
  } catch {
    // ponytail: DB unreachable → fall back to env var
    cached = loadFromEnv();
  }
};

export const getDeviceMap = (): Readonly<Record<string, DeviceIdentity>> => {
  return cached ?? loadFromEnv();
};

export const resolveDevice = (deviceId: string): DeviceIdentity | null =>
  getDeviceMap()[deviceId] ?? null;

/** Reset cache — for testing only. */
export const _resetCache = (): void => {
  cached = undefined;
};
