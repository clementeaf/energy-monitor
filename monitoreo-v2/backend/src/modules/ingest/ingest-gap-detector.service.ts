import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IngestGap } from '../platform/entities/ingest-gap.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { MeterReadingStatusService } from './meter-reading-status.service';
import { getStaleThresholdHours } from '../../lib/tenant-settings';
import {
  WebhookDispatcherService,
  type WebhookDispatchPayload,
} from '../webhooks/webhook-dispatcher.service';

const GAP_BUCKET_MINUTES = 15;

@Injectable()
export class IngestGapDetectorService {
  private readonly logger = new Logger(IngestGapDetectorService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(IngestGap)
    private readonly gapRepo: Repository<IngestGap>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly meterStatusService: MeterReadingStatusService,
    private readonly webhookDispatcher: WebhookDispatcherService,
  ) {}

  /**
   * Detects missing 15-minute buckets and stale meters every 15 minutes.
   */
  @Cron('0 */15 * * * *', { name: 'ingest-gap-detector' })
  async run(): Promise<void> {
    await this.resolveRecoveredGaps();
    const gapsCreated = await this.detectMissingBuckets();
    const staleMarked = await this.markStaleMeters();
    if (gapsCreated > 0 || staleMarked > 0) {
      this.logger.log(`Ingest check: ${gapsCreated} gaps opened, ${staleMarked} stale fault events`);
    }
  }

  /**
   * Opens ingest_gaps rows for active meters without a reading in the last bucket.
   */
  async detectMissingBuckets(): Promise<number> {
    const rows: Array<{
      tenant_id: string;
      meter_id: string;
      gap_start: Date;
    }> = await this.dataSource.query(
      `SELECT
         m.tenant_id,
         m.id AS meter_id,
         COALESCE(mrs.last_reading_at, m.created_at) AS gap_start
       FROM meters m
       LEFT JOIN meter_reading_status mrs ON mrs.meter_id = m.id
       WHERE m.is_active = true
         AND (
           mrs.last_reading_at IS NULL
           OR mrs.last_reading_at < NOW() - ($1 || ' minutes')::interval
         )
         AND NOT EXISTS (
           SELECT 1 FROM ingest_gaps ig
           WHERE ig.meter_id = m.id AND ig.status = 'open'
         )`,
      [String(GAP_BUCKET_MINUTES)],
    );

    let created = 0;
    for (const row of rows) {
      await this.gapRepo.save(
        this.gapRepo.create({
          tenantId: row.tenant_id,
          meterId: row.meter_id,
          gapStart: row.gap_start,
          gapEnd: new Date(),
          status: 'open',
        }),
      );
      await this.webhookDispatcher.dispatch(row.tenant_id, 'gap.detected', {
        event: 'gap.detected',
        tenantId: row.tenant_id,
        meterId: row.meter_id,
        gapStart: row.gap_start.toISOString(),
        occurredAt: new Date().toISOString(),
      });
      created += 1;
    }
    return created;
  }

  /**
   * Resolves open gaps when readings have resumed within the last bucket.
   */
  async resolveRecoveredGaps(): Promise<number> {
    const result = await this.dataSource.query(
      `UPDATE ingest_gaps ig
       SET status = 'resolved', resolved_at = NOW()
       FROM meter_reading_status mrs
       WHERE ig.meter_id = mrs.meter_id
         AND ig.status = 'open'
         AND mrs.last_reading_at >= NOW() - ($1 || ' minutes')::interval
       RETURNING ig.id`,
      [String(GAP_BUCKET_MINUTES)],
    );
    return result.length;
  }

  /**
   * Creates fault_events for stale meters per tenant threshold (default 4h).
   */
  async markStaleMeters(): Promise<number> {
    const tenants = await this.tenantRepo.find({ where: { isActive: true } });
    let created = 0;

    for (const tenant of tenants) {
      const thresholdHours = getStaleThresholdHours(tenant.settings);
      const staleMeters = await this.meterStatusService.getStaleMeters(tenant.id, thresholdHours);

      for (const meter of staleMeters) {
        const existing = await this.dataSource.query(
          `SELECT 1 FROM fault_events
           WHERE meter_id = $1 AND fault_type = 'METER_STALE' AND resolved_at IS NULL
           LIMIT 1`,
          [meter.meter_id],
        );
        if (existing.length > 0) continue;

        await this.dataSource.query(
          `INSERT INTO fault_events (
             tenant_id, building_id, meter_id, fault_type, severity, description, started_at
           ) VALUES ($1, $2, $3, 'METER_STALE', 'high', $4, NOW())`,
          [
            meter.tenant_id,
            meter.building_id,
            meter.meter_id,
            `No reading for ${Number(meter.stale_hours).toFixed(1)}h (threshold ${thresholdHours}h)`,
          ],
        );

        const stalePayload: WebhookDispatchPayload = {
          event: 'reading.stale',
          tenantId: meter.tenant_id,
          meterId: meter.meter_id,
          buildingId: meter.building_id,
          staleHours: Number(meter.stale_hours),
          thresholdHours,
          occurredAt: new Date().toISOString(),
        };
        await this.webhookDispatcher.dispatch(meter.tenant_id, 'reading.stale', stalePayload);
        await this.webhookDispatcher.dispatch(meter.tenant_id, 'meter.offline', {
          ...stalePayload,
          event: 'meter.offline',
        });

        created += 1;
      }
    }
    return created;
  }
}
