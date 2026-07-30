import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface VarelectricSyncSource {
  db: string;
  buildingId: string;
  tenantId: string;
}

interface VarElectricRow {
  id_remarcador: number;
  fecha: string;
  [key: string]: unknown;
}

interface MappedReading {
  voltage_l1: number | null;
  voltage_l2: number | null;
  voltage_l3: number | null;
  current_l1: number | null;
  current_l2: number | null;
  current_l3: number | null;
  power_kw: number | null;
  power_factor: number | null;
  energy_kwh_total: number | null;
}

const TAG_MAP: Record<keyof MappedReading, string> = {
  voltage_l1: 'tag1',
  voltage_l2: 'tag2',
  voltage_l3: 'tag3',
  current_l1: 'tag4',
  current_l2: 'tag5',
  current_l3: 'tag6',
  power_kw: 'tag9',
  power_factor: 'tag12',
  energy_kwh_total: 'tag14',
};

@Injectable()
export class VarelectricSyncService {
  private readonly logger = new Logger(VarelectricSyncService.name);
  private readonly meterCache = new Map<string, string | null>();

  private readonly sources: VarelectricSyncSource[] = [
    { db: 'renaissance', buildingId: 'b0000001-0000-0000-0000-000000000011', tenantId: '84adf8d4-830d-46e1-bef5-e2eac6a19014' },
    { db: 'altopena', buildingId: 'b0000002-0000-0000-0000-000000000000', tenantId: '84adf8d4-830d-46e1-bef5-e2eac6a19014' },
    { db: 'quilicura', buildingId: 'b0000003-0000-0000-0000-000000000000', tenantId: '84adf8d4-830d-46e1-bef5-e2eac6a19014' },
  ];

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  static mapTagsToReadings(row: VarElectricRow): MappedReading {
    const mapped: MappedReading = {} as MappedReading;
    for (const [col, tag] of Object.entries(TAG_MAP)) {
      const val = row[tag];
      mapped[col as keyof MappedReading] = val != null ? Number(val) : null;
    }
    return mapped;
  }

  static shouldSkipRow(row: VarElectricRow): boolean {
    return row.tag9 == null;
  }

  async resolveMeterId(buildingId: string, idRemarcador: number): Promise<string | null> {
    const key = `${buildingId}:${idRemarcador}`;
    if (this.meterCache.has(key)) return this.meterCache.get(key)!;

    const rows = await this.dataSource.query(
      `SELECT id FROM meters WHERE building_id = $1 AND metadata->>'id_remarcador' = $2 LIMIT 1`,
      [buildingId, String(idRemarcador)],
    );
    const id = rows.length > 0 ? rows[0].id : null;
    this.meterCache.set(key, id);
    return id;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncAll(): Promise<void> {
    for (const source of this.sources) {
      try {
        await this.syncSource(source);
      } catch (err) {
        this.logger.error(`Sync failed for ${source.db}: ${(err as Error).message}`);
      }
    }
  }

  async syncSource(source: VarelectricSyncSource): Promise<{ inserted: number; skipped: number }> {
    const lastTimestamp = await this.getLastSyncTimestamp(source.buildingId);

    const extDs = new DataSource({
      type: 'postgres',
      host: this.configService.get('DB_HOST'),
      port: Number(this.configService.get('DB_PORT', 5432)),
      database: source.db,
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      ssl: this.configService.get('RDS_CA_BUNDLE_PATH')
        ? { rejectUnauthorized: true, ca: require('fs').readFileSync(this.configService.get('RDS_CA_BUNDLE_PATH')) }
        : false,
    });

    await extDs.initialize();
    try {
      const rows: VarElectricRow[] = await extDs.query(
        `SELECT * FROM var_electric WHERE fecha > $1 ORDER BY fecha ASC LIMIT 10000`,
        [lastTimestamp],
      );

      let inserted = 0;
      let skipped = 0;

      for (const row of rows) {
        if (VarelectricSyncService.shouldSkipRow(row)) {
          skipped++;
          continue;
        }

        const meterId = await this.resolveMeterId(source.buildingId, row.id_remarcador);
        if (!meterId) {
          skipped++;
          continue;
        }

        const mapped = VarelectricSyncService.mapTagsToReadings(row);
        await this.dataSource.query(
          `INSERT INTO readings (tenant_id, meter_id, timestamp, voltage_l1, voltage_l2, voltage_l3,
             current_l1, current_l2, current_l3, power_kw, power_factor, energy_kwh_total)
           VALUES ($1, $2, $3 AT TIME ZONE 'America/Santiago', $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT DO NOTHING`,
          [
            source.tenantId, meterId, row.fecha,
            mapped.voltage_l1, mapped.voltage_l2, mapped.voltage_l3,
            mapped.current_l1, mapped.current_l2, mapped.current_l3,
            mapped.power_kw, mapped.power_factor, mapped.energy_kwh_total,
          ],
        );
        inserted++;
      }

      if (inserted > 0) {
        this.logger.log(`${source.db}: synced ${inserted} readings (${skipped} skipped)`);
      }
      return { inserted, skipped };
    } finally {
      await extDs.destroy();
    }
  }

  private async getLastSyncTimestamp(buildingId: string): Promise<string> {
    const rows = await this.dataSource.query(
      `SELECT MAX(r.timestamp) AS last_ts
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE m.building_id = $1 AND m.metadata->>'source' = 'varelectric'`,
      [buildingId],
    );
    return rows[0]?.last_ts ?? '2020-01-01T00:00:00Z';
  }
}
