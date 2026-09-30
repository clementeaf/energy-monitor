import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateVarElectricDto } from './dto/create-var-electric.dto';

const VARELECTRIC_SOURCE = 'varelectric';
const DEFAULT_TIMEZONE = 'America/Santiago';
const INSERT_CHUNK_SIZE = 500;
const EXPLICIT_OFFSET = /([zZ]|[+-]\d{2}:?\d{2})$/;

const TAG_COLUMNS = {
  voltage_l1: 'tag1',
  voltage_l2: 'tag2',
  voltage_l3: 'tag3',
  current_l1: 'tag4',
  current_l2: 'tag5',
  current_l3: 'tag6',
  power_kw: 'tag9',
  power_factor: 'tag12',
  energy_kwh_total: 'tag14',
} as const satisfies Record<string, keyof CreateVarElectricDto>;

const READING_COLUMNS = Object.keys(
  TAG_COLUMNS,
) as (keyof typeof TAG_COLUMNS)[];

interface BuildingScope {
  id: string;
  code: string;
  timezone: string;
}

export interface VarelectricIngestResult {
  inserted: number;
  skipped: number;
}

@Injectable()
export class VarelectricIngressService {
  constructor(private readonly dataSource: DataSource) {}

  static hasPower(record: CreateVarElectricDto): boolean {
    return record.tag9 != null;
  }

  static mapTagsToReadings(record: CreateVarElectricDto): (number | null)[] {
    return READING_COLUMNS.map((column) => record[TAG_COLUMNS[column]] ?? null);
  }

  static splitTimestamp(fecha: string): {
    absolute: string | null;
    local: string | null;
  } {
    return EXPLICIT_OFFSET.test(fecha)
      ? { absolute: fecha, local: null }
      : { absolute: null, local: fecha };
  }

  async ingest(
    user: JwtPayload,
    records: CreateVarElectricDto[],
  ): Promise<VarelectricIngestResult> {
    const building = await this.resolveBuilding(user);
    const withPower = records.filter((record) =>
      VarelectricIngressService.hasPower(record),
    );
    if (withPower.length === 0) return { inserted: 0, skipped: records.length };

    const remarcadorIds = [...new Set(withPower.map((r) => r.id_remarcador))];
    const meterIdByRemarcador = await this.ensureMeters(
      user.tenantId,
      building,
      remarcadorIds,
    );

    let inserted = 0;
    for (let i = 0; i < withPower.length; i += INSERT_CHUNK_SIZE) {
      const chunk = withPower.slice(i, i + INSERT_CHUNK_SIZE);
      inserted += await this.insertReadings(
        user.tenantId,
        building,
        chunk,
        meterIdByRemarcador,
      );
    }
    return { inserted, skipped: records.length - inserted };
  }

  private async resolveBuilding(user: JwtPayload): Promise<BuildingScope> {
    if (user.buildingIds.length !== 1) {
      throw new UnprocessableEntityException(
        `Varelectric API key must be scoped to exactly one building (has ${user.buildingIds.length})`,
      );
    }
    const [buildingId] = user.buildingIds;
    const rows = await this.dataSource.query<BuildingScope[]>(
      `SELECT id::text, code, COALESCE(timezone, $3) AS timezone
       FROM buildings WHERE id = $1 AND tenant_id = $2`,
      [buildingId, user.tenantId, DEFAULT_TIMEZONE],
    );
    if (rows.length === 0) {
      throw new NotFoundException(
        `Building ${buildingId} not found for tenant ${user.tenantId}`,
      );
    }
    return rows[0];
  }

  private async ensureMeters(
    tenantId: string,
    building: BuildingScope,
    remarcadorIds: number[],
  ): Promise<Map<number, string>> {
    await this.dataSource.query(
      `INSERT INTO meters (tenant_id, building_id, name, code, metadata)
       SELECT $1, $2, 'Remarcador ' || rid, $3 || '-' || rid,
              jsonb_build_object('source', $5::text, 'id_remarcador', rid)
       FROM unnest($4::int[]) AS rid
       WHERE NOT EXISTS (
         SELECT 1 FROM meters m
         WHERE m.building_id = $2 AND m.metadata->>'id_remarcador' = rid::text
       )
       ON CONFLICT (tenant_id, code) DO NOTHING`,
      [tenantId, building.id, building.code, remarcadorIds, VARELECTRIC_SOURCE],
    );
    const rows = await this.dataSource.query<
      { id: string; id_remarcador: string }[]
    >(
      `SELECT id::text, metadata->>'id_remarcador' AS id_remarcador
       FROM meters
       WHERE building_id = $1 AND metadata->>'id_remarcador' = ANY($2::text[])`,
      [building.id, remarcadorIds.map(String)],
    );
    return new Map(rows.map((row) => [Number(row.id_remarcador), row.id]));
  }

  private async insertReadings(
    tenantId: string,
    building: BuildingScope,
    records: CreateVarElectricDto[],
    meterIdByRemarcador: Map<number, string>,
  ): Promise<number> {
    const paramsPerRow = 3 + READING_COLUMNS.length;
    const values: unknown[] = [];
    const tuples = records.map((record, rowIndex) => {
      const { absolute, local } = VarelectricIngressService.splitTimestamp(
        record.fecha,
      );
      values.push(
        meterIdByRemarcador.get(record.id_remarcador),
        absolute,
        local,
        ...VarelectricIngressService.mapTagsToReadings(record),
      );
      const p = (n: number) => `$${3 + rowIndex * paramsPerRow + n}`;
      const readingParams = READING_COLUMNS.map((_, i) => p(4 + i));
      return `($1, ${p(1)}::uuid, COALESCE(${p(2)}::timestamptz, ${p(3)}::timestamp AT TIME ZONE $2), $3, ${readingParams.join(', ')})`;
    });

    const inserted = await this.dataSource.query<unknown[]>(
      `INSERT INTO readings (tenant_id, meter_id, timestamp, source, ${READING_COLUMNS.join(', ')})
       SELECT v.tenant_id::uuid, v.meter_id, v.ts, v.source, ${READING_COLUMNS.map((c) => `v.${c}::double precision`).join(', ')}
       FROM (VALUES ${tuples.join(', ')}) AS v(tenant_id, meter_id, ts, source, ${READING_COLUMNS.join(', ')})
       ON CONFLICT DO NOTHING
       RETURNING 1`,
      [tenantId, building.timezone, VARELECTRIC_SOURCE, ...values],
    );
    return inserted.length;
  }
}
