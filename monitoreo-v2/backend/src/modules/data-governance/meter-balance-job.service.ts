import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

const BALANCE_DELTA_THRESHOLD_PCT = 0.05;
const MIN_ABSOLUTE_DELTA_KWH = 1;

interface BalanceViewRow {
  parent_meter_id: string;
  tenant_id: string;
  day: string;
  sum_children: string;
  parent_kwh: string;
  delta: string;
}

/**
 * Daily job: flags parent/child energy imbalances from v_meter_balance_daily (GAP-161).
 */
@Injectable()
export class MeterBalanceJobService {
  private readonly logger = new Logger(MeterBalanceJobService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Runs daily balance check for yesterday's readings.
   */
  @Cron('0 0 4 * * *', { name: 'meter-balance-check' })
  async runDailyCheck(): Promise<number> {
    const day = this.yesterdayUtcDate();
    return this.detectAnomaliesForDay(day);
  }

  /**
   * Inserts balance_anomalies rows exceeding threshold for a given day.
   * @param day - UTC date (YYYY-MM-DD)
   * @returns Number of anomalies inserted
   */
  async detectAnomaliesForDay(day: string): Promise<number> {
    const rows = await this.dataSource.query<BalanceViewRow[]>(
      `SELECT parent_meter_id, tenant_id, day::text,
              sum_children::text, parent_kwh::text, delta::text
       FROM v_meter_balance_daily
       WHERE day = $1::date`,
      [day],
    );

    let inserted = 0;
    for (const row of rows) {
      const parentKwh = Number(row.parent_kwh);
      const delta = Number(row.delta);
      const threshold = Math.max(MIN_ABSOLUTE_DELTA_KWH, Math.abs(parentKwh) * BALANCE_DELTA_THRESHOLD_PCT);
      if (Math.abs(delta) <= threshold) continue;

      const deltaPct = parentKwh !== 0 ? (delta / parentKwh) * 100 : null;
      const result = await this.dataSource.query<{ id: string }[]>(
        `INSERT INTO balance_anomalies (
           tenant_id, parent_meter_id, day,
           sum_children, parent_kwh, delta, delta_pct
         ) VALUES ($1, $2, $3::date, $4, $5, $6, $7)
         ON CONFLICT (parent_meter_id, day) DO NOTHING
         RETURNING id::text`,
        [
          row.tenant_id,
          row.parent_meter_id,
          day,
          row.sum_children,
          row.parent_kwh,
          row.delta,
          deltaPct,
        ],
      );
      if (result.length > 0) inserted += 1;
    }

    if (inserted > 0) {
      this.logger.log(`Balance check ${day}: ${inserted} anomalies recorded`);
    }
    return inserted;
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
