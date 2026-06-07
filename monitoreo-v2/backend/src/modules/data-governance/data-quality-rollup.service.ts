import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

/**
 * Nightly rollup of readings.quality into data_quality_daily (GAP-163).
 */
@Injectable()
export class DataQualityRollupService {
  private readonly logger = new Logger(DataQualityRollupService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Aggregates quality percentages per tenant/building for yesterday.
   */
  @Cron('0 30 3 * * *', { name: 'data-quality-rollup' })
  async runDailyRollup(): Promise<number> {
    const day = this.yesterdayUtcDate();
    return this.rollupDay(day);
  }

  /**
   * Rolls up reading quality counts for a UTC day.
   * @param day - Date string YYYY-MM-DD
   * @returns Number of rows upserted
   */
  async rollupDay(day: string): Promise<number> {
    const rows = await this.dataSource.query<{ count: string }[]>(
      `WITH agg AS (
         INSERT INTO data_quality_daily (
           tenant_id, building_id, day,
           measured_pct, estimated_pct, invalid_pct, unknown_pct, total
         )
         SELECT
           m.tenant_id,
           m.building_id,
           $1::date AS day,
           ROUND(100.0 * COUNT(*) FILTER (WHERE r.quality = 'measured') / NULLIF(COUNT(*), 0), 2),
           ROUND(100.0 * COUNT(*) FILTER (WHERE r.quality = 'estimated') / NULLIF(COUNT(*), 0), 2),
           ROUND(100.0 * COUNT(*) FILTER (WHERE r.quality = 'invalid') / NULLIF(COUNT(*), 0), 2),
           ROUND(100.0 * COUNT(*) FILTER (WHERE r.quality = 'unknown') / NULLIF(COUNT(*), 0), 2),
           COUNT(*)::bigint
         FROM readings r
         JOIN meters m ON m.id = r.meter_id
         WHERE r.timestamp >= $1::date
           AND r.timestamp < ($1::date + interval '1 day')
         GROUP BY m.tenant_id, m.building_id
         ON CONFLICT (tenant_id, building_id, day) DO UPDATE SET
           measured_pct = EXCLUDED.measured_pct,
           estimated_pct = EXCLUDED.estimated_pct,
           invalid_pct = EXCLUDED.invalid_pct,
           unknown_pct = EXCLUDED.unknown_pct,
           total = EXCLUDED.total
         RETURNING 1
       )
       SELECT COUNT(*)::text AS count FROM agg`,
      [day],
    );

    const count = Number(rows[0]?.count ?? 0);
    if (count > 0) {
      this.logger.log(`Data quality rollup ${day}: ${count} building rows`);
    }
    return count;
  }

  /**
   * Returns yesterday as UTC date string.
   */
  private yesterdayUtcDate(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
}
