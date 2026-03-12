/**
 * Ejecuta consultas de verificación sobre RDS (readings, meters, buildings, hierarchy).
 * Misma lógica que db-verify-lambda e infra/db-verify/verify-rds.mjs.
 */

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

const SQL_011_SESSIONS = `
BEGIN;
CREATE TABLE IF NOT EXISTS sessions (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64)  NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
COMMIT;
`;

const SQL_012_SEED_TEST_USER = `
BEGIN;
INSERT INTO users (id, email, name, role_id, is_active, external_id, provider)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'test@energy-monitor.local',
  'Usuario Prueba',
  1,
  true,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active;
COMMIT;
`;

const SQL_012_SEED_SESSION = `
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO sessions (user_id, token_hash, expires_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  encode(digest('test-token-energy-monitor', 'sha256'), 'hex'),
  now() + interval '1 year'
)
ON CONFLICT (token_hash) DO UPDATE SET
  expires_at = now() + interval '1 year';
COMMIT;
`;

export interface DbVerifyResult {
  counts: { readings: number; meters: number; buildings: number; staging: number | null };
  metersPerBuilding: Array<{ building_id: string; meter_count: number }>;
  meterIdSample: string[];
  meterIdLengthWarning: boolean;
  timeRanges: Array<{ meter_id: string; min_ts: string; max_ts: string }>;
  hierarchy: Array<{ building_id: string; node_count: number }> | null;
  buildings: Array<{ id: string; name: string; meters_count: number }>;
}

@Injectable()
export class DbVerifyService {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<DbVerifyResult> {
    const [readingsRes, metersRes, buildingsRes] = await Promise.all([
      this.dataSource.query<{ total: string }>('SELECT COUNT(*)::bigint AS total FROM readings'),
      this.dataSource.query<{ total: string }>('SELECT COUNT(*)::bigint AS total FROM meters'),
      this.dataSource.query<{ total: string }>('SELECT COUNT(*)::bigint AS total FROM buildings'),
    ]);

    type CountRow = { total: string };
    const countVal = (rows: CountRow[]): number => Number(rows[0]?.total ?? 0);
    let staging: number | null = null;
    try {
      const stagingRes = (await this.dataSource.query(
        'SELECT COUNT(*)::bigint AS total FROM readings_import_staging',
      )) as CountRow[];
      staging = countVal(stagingRes);
    } catch {
      // tabla puede no existir
    }

    const counts = {
      readings: countVal(readingsRes as unknown as CountRow[]),
      meters: countVal(metersRes as unknown as CountRow[]),
      buildings: countVal(buildingsRes as unknown as CountRow[]),
      staging,
    };

    type MeterPerBuildingRow = { building_id: string; meter_count: string };
    const metersPerBuildingRows = (await this.dataSource.query(
      `SELECT building_id, COUNT(*)::int AS meter_count
       FROM meters GROUP BY building_id ORDER BY meter_count DESC LIMIT 20`,
    )) as MeterPerBuildingRow[];
    const metersPerBuilding = metersPerBuildingRows.map((r: MeterPerBuildingRow) => ({
      building_id: r.building_id,
      meter_count: Number(r.meter_count),
    }));

    type MeterIdRow = { meter_id: string };
    const meterIdRows = (await this.dataSource.query(
      'SELECT id AS meter_id FROM meters ORDER BY id LIMIT 50',
    )) as MeterIdRow[];
    const meterIdSample = meterIdRows.map((r: MeterIdRow) => r.meter_id);
    const meterIdLengthWarning = meterIdSample.some((id: string) => id.length > 10);

    type TimeRangeRow = { meter_id: string; min_ts: string; max_ts: string };
    const timeRanges = (await this.dataSource.query(
      `SELECT meter_id, MIN(timestamp)::text AS min_ts, MAX(timestamp)::text AS max_ts
       FROM readings GROUP BY meter_id ORDER BY meter_id LIMIT 20`,
    )) as TimeRangeRow[];

    let hierarchy: DbVerifyResult['hierarchy'] = null;
    try {
      type HierarchyRow = { building_id: string; node_count: string };
      const hierarchyRows = (await this.dataSource.query(
        `SELECT building_id, COUNT(*)::int AS node_count
         FROM hierarchy_nodes GROUP BY building_id ORDER BY building_id`,
      )) as HierarchyRow[];
      hierarchy = hierarchyRows.map((r: HierarchyRow) => ({
        building_id: r.building_id,
        node_count: Number(r.node_count),
      }));
    } catch {
      // tabla puede no existir
    }

    type BuildingRow = { id: string; name: string; meters_count: string };
    const buildingsRows = (await this.dataSource.query(
      `SELECT b.id, b.name, (SELECT COUNT(*) FROM meters m WHERE m.building_id = b.id) AS meters_count
       FROM buildings b ORDER BY b.id`,
    )) as BuildingRow[];
    const buildings = buildingsRows.map((r: BuildingRow) => ({
      id: r.id,
      name: r.name,
      meters_count: Number(r.meters_count),
    }));

    return {
      counts,
      metersPerBuilding,
      meterIdSample,
      meterIdLengthWarning,
      timeRanges,
      hierarchy,
      buildings,
    };
  }

  /**
   * Aplica migraciones de auth: tabla sessions y seed usuario de prueba + sesión.
   * Idempotente (IF NOT EXISTS / ON CONFLICT).
   */
  async applyAuthMigrations(): Promise<{ applied: string[] }> {
    const applied: string[] = [];
    await this.dataSource.query(SQL_011_SESSIONS);
    applied.push('011_sessions');
    await this.dataSource.query(SQL_012_SEED_TEST_USER);
    applied.push('012_seed_test_user');
    await this.dataSource.query(SQL_012_SEED_SESSION);
    applied.push('012_seed_session');
    return { applied };
  }
}
