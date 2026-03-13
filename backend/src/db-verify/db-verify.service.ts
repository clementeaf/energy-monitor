/**
 * Ejecuta consultas de verificación sobre RDS (readings, meters, buildings, hierarchy).
 * Misma lógica que db-verify-lambda e infra/db-verify/verify-rds.mjs.
 */

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

const SQL_011_TABLE = `CREATE TABLE IF NOT EXISTS sessions (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64)  NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
)`;
const SQL_011_IDX_USER = `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
const SQL_011_IDX_EXPIRES = `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`;
const SQL_011_IDX_TOKEN = `CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)`;

/** Usuario de prueba: external_id/provider con valor sentinela para cumplir NOT NULL si aplica. */
const SQL_012_USER = `INSERT INTO users (id, email, name, role_id, is_active, external_id, provider)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'test@energy-monitor.local',
  'Usuario Prueba',
  1,
  true,
  'session-test',
  'session'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  external_id = EXCLUDED.external_id,
  provider = EXCLUDED.provider`;

/* SHA256 hex de 'test-token-energy-monitor' */
const TEST_TOKEN_HASH = '078266506a1da526b982f09c831eedcef3ad02065ddfe562ec07f7427f37463e';

const SQL_012_SESSION = `INSERT INTO sessions (user_id, token_hash, expires_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  '${TEST_TOKEN_HASH}',
  now() + interval '1 year'
)
ON CONFLICT (token_hash) DO UPDATE SET
  expires_at = now() + interval '1 year'`;

/** Por building_id: meter_ids en la jerarquía y cuáles tienen filas en readings. */
export interface HierarchyVsReadingsRow {
  building_id: string;
  hierarchy_meter_count: number;
  in_readings_count: number;
  meter_ids_in_readings: string[];
  meter_ids_missing_in_readings: string[];
}

export interface DbVerifyResult {
  /** staging es estimado (pg_class) para no hacer COUNT(*) sobre millones de filas. */
  counts: { readings: number; meters: number; buildings: number; staging: number | null };
  /** Centros/edificios distintos en readings_import_staging (center_name). */
  stagingCentersCount: number | null;
  metersPerBuilding: Array<{ building_id: string; meter_count: number }>;
  meterIdSample: string[];
  meterIdLengthWarning: boolean;
  timeRanges: Array<{ meter_id: string; min_ts: string; max_ts: string }>;
  hierarchy: Array<{ building_id: string; node_count: number }> | null;
  buildings: Array<{ id: string; name: string; meters_count: number }>;
  /** Cruzado hierarchy_nodes.meter_id vs readings: por building_id, cuántos medidores de la jerarquía tienen datos. */
  hierarchyVsReadings: HierarchyVsReadingsRow[] | null;
  /** Errores no fatales (consultas que fallaron; el resto del resultado sigue siendo válido). */
  errors?: string[];
}

@Injectable()
export class DbVerifyService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Ejecuta consultas de verificación. Cada bloque está en try/catch para no devolver 500
   * si una tabla no existe o falla una query; se devuelven valores por defecto y opcionalmente errors[].
   */
  async run(): Promise<DbVerifyResult> {
    type CountRow = { total: string };
    const countVal = (rows: CountRow[]): number => Number(rows[0]?.total ?? 0);
    const errors: string[] = [];

    let readingsCount = 0;
    let metersCount = 0;
    let buildingsCount = 0;
    try {
      const [readingsRes, metersRes, buildingsRes] = await Promise.all([
        this.dataSource.query<CountRow[]>('SELECT COUNT(*)::bigint AS total FROM readings'),
        this.dataSource.query<CountRow[]>('SELECT COUNT(*)::bigint AS total FROM meters'),
        this.dataSource.query<CountRow[]>('SELECT COUNT(*)::bigint AS total FROM buildings'),
      ]);
      readingsCount = countVal(readingsRes);
      metersCount = countVal(metersRes);
      buildingsCount = countVal(buildingsRes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`counts: ${msg}`);
    }

    let staging: number | null = null;
    try {
      const stagingRes = await this.dataSource.query<Array<{ reltuples: string }>>(
        `SELECT COALESCE(reltuples::bigint, 0)::text AS reltuples
         FROM pg_class WHERE relname = 'readings_import_staging'`,
      );
      staging = stagingRes[0] ? Math.max(0, Math.round(Number(stagingRes[0].reltuples))) : null;
    } catch {
      // tabla puede no existir
    }

    let stagingCentersCount: number | null = null;
    try {
      const centerRes = await this.dataSource.query<Array<{ count: string }>>(
        `SELECT COUNT(DISTINCT center_name)::bigint AS count FROM readings_import_staging`,
      );
      stagingCentersCount = centerRes[0] ? Number(centerRes[0].count) : null;
    } catch {
      // puede ser costoso en tablas muy grandes
    }

    const counts = {
      readings: readingsCount,
      meters: metersCount,
      buildings: buildingsCount,
      staging,
    };

    type MeterPerBuildingRow = { building_id: string; meter_count: string };
    let metersPerBuilding: Array<{ building_id: string; meter_count: number }> = [];
    try {
      const rows = await this.dataSource.query<MeterPerBuildingRow[]>(
        `SELECT building_id, COUNT(*)::int AS meter_count
         FROM meters GROUP BY building_id ORDER BY meter_count DESC LIMIT 20`,
      );
      metersPerBuilding = rows.map((r) => ({
        building_id: r.building_id,
        meter_count: Number(r.meter_count),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`metersPerBuilding: ${msg}`);
    }

    type MeterIdRow = { meter_id: string };
    let meterIdSample: string[] = [];
    try {
      const meterIdRows = await this.dataSource.query<MeterIdRow[]>(
        'SELECT id AS meter_id FROM meters ORDER BY id LIMIT 50',
      );
      meterIdSample = meterIdRows.map((r) => r.meter_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`meterIdSample: ${msg}`);
    }
    const meterIdLengthWarning = meterIdSample.some((id) => id.length > 10);

    type TimeRangeRow = { meter_id: string; min_ts: string; max_ts: string };
    let timeRanges: Array<{ meter_id: string; min_ts: string; max_ts: string }> = [];
    try {
      const rows = await this.dataSource.query<TimeRangeRow[]>(
        `SELECT meter_id, MIN(timestamp)::text AS min_ts, MAX(timestamp)::text AS max_ts
         FROM readings GROUP BY meter_id ORDER BY meter_id LIMIT 20`,
      );
      timeRanges = rows;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`timeRanges: ${msg}`);
    }

    let hierarchy: DbVerifyResult['hierarchy'] = null;
    try {
      type HierarchyRow = { building_id: string; node_count: string };
      const hierarchyRows = await this.dataSource.query<HierarchyRow[]>(
        `SELECT building_id, COUNT(*)::int AS node_count
         FROM hierarchy_nodes GROUP BY building_id ORDER BY building_id`,
      );
      hierarchy = hierarchyRows.map((r) => ({
        building_id: r.building_id,
        node_count: Number(r.node_count),
      }));
    } catch {
      // tabla puede no existir
    }

    type BuildingRow = { id: string; name: string; meters_count: string };
    let buildings: Array<{ id: string; name: string; meters_count: number }> = [];
    try {
      const buildingsRows = await this.dataSource.query<BuildingRow[]>(
        `SELECT b.id, b.name, (SELECT COUNT(*) FROM meters m WHERE m.building_id = b.id) AS meters_count
         FROM buildings b ORDER BY b.id`,
      );
      buildings = buildingsRows.map((r) => ({
        id: r.id,
        name: r.name,
        meters_count: Number(r.meters_count),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`buildings: ${msg}`);
    }

    let hierarchyVsReadings: DbVerifyResult['hierarchyVsReadings'] = null;
    try {
      type BidRow = { building_id: string };
      const bidRows = await this.dataSource.query<BidRow[]>(
        `SELECT DISTINCT building_id FROM hierarchy_nodes ORDER BY building_id`,
      );
      const rows: HierarchyVsReadingsRow[] = [];
      for (const { building_id } of bidRows) {
        const hierarchyMeters = await this.dataSource.query<{ meter_id: string }[]>(
          `SELECT DISTINCT meter_id FROM hierarchy_nodes
           WHERE building_id = $1 AND meter_id IS NOT NULL ORDER BY meter_id`,
          [building_id],
        );
        const hIds = hierarchyMeters.map((r) => r.meter_id);
        if (hIds.length === 0) {
          rows.push({
            building_id,
            hierarchy_meter_count: 0,
            in_readings_count: 0,
            meter_ids_in_readings: [],
            meter_ids_missing_in_readings: [],
          });
          continue;
        }
        const placeholders = hIds.map((_, i) => `$${i + 1}`).join(',');
        const inReadings = await this.dataSource.query<{ meter_id: string }[]>(
          `SELECT DISTINCT meter_id FROM readings WHERE meter_id IN (${placeholders})`,
          hIds,
        );
        const inReadingsSet = new Set(inReadings.map((r) => r.meter_id));
        const inList = hIds.filter((id) => inReadingsSet.has(id));
        const missingList = hIds.filter((id) => !inReadingsSet.has(id));
        rows.push({
          building_id,
          hierarchy_meter_count: hIds.length,
          in_readings_count: inList.length,
          meter_ids_in_readings: inList.length <= 30 ? inList : [...inList.slice(0, 15), `... +${inList.length - 15} más`],
          meter_ids_missing_in_readings:
            missingList.length <= 30 ? missingList : [...missingList.slice(0, 15), `... +${missingList.length - 15} más`],
        });
      }
      hierarchyVsReadings = rows;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`hierarchyVsReadings: ${msg}`);
    }

    const result: DbVerifyResult = {
      counts,
      stagingCentersCount,
      metersPerBuilding,
      meterIdSample,
      meterIdLengthWarning,
      timeRanges,
      hierarchy,
      buildings,
      hierarchyVsReadings,
    };
    if (errors.length > 0) {
      result.errors = errors;
    }
    return result;
  }

  /**
   * Aplica migraciones de auth: tabla sessions y seed usuario de prueba + sesión.
   * Idempotente (IF NOT EXISTS / ON CONFLICT). Una sentencia por query para evitar errores en RDS.
   */
  async applyAuthMigrations(): Promise<{ applied: string[] }> {
    const applied: string[] = [];
    await this.dataSource.query(SQL_011_TABLE);
    await this.dataSource.query(SQL_011_IDX_USER);
    await this.dataSource.query(SQL_011_IDX_EXPIRES);
    await this.dataSource.query(SQL_011_IDX_TOKEN);
    applied.push('011_sessions');
    await this.dataSource.query(SQL_012_USER);
    applied.push('012_seed_test_user');
    await this.dataSource.query(SQL_012_SESSION);
    applied.push('012_seed_session');
    return { applied };
  }
}
