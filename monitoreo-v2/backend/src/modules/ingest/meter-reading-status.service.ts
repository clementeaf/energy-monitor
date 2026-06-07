import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { MeterReadingStatus } from '../platform/entities/meter-reading-status.entity';
import { getStaleThresholdHours } from '../../lib/tenant-settings';

export interface StaleMeterRow {
  meter_id: string;
  meter_name: string;
  building_id: string;
  tenant_id: string;
  last_reading_at: string | null;
  last_source: string | null;
  stale_hours: string;
}

export interface MeterStatusResponse {
  meterId: string;
  lastReadingAt: string | null;
  lastIngestedAt: string | null;
  lastSource: string | null;
  lagSeconds: number | null;
  isStale: boolean;
  staleThresholdHours: number;
}

/**
 * Computes lag in seconds from last reading timestamp to now.
 */
export function computeLagSeconds(lastReadingAt: Date | string | null): number | null {
  if (!lastReadingAt) return null;
  const ms = Date.now() - new Date(lastReadingAt).getTime();
  return Math.max(0, Math.floor(ms / 1000));
}

@Injectable()
export class MeterReadingStatusService {
  constructor(
    @InjectRepository(MeterReadingStatus)
    private readonly repo: Repository<MeterReadingStatus>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Returns active meters whose last reading exceeds the stale threshold.
   */
  async getStaleMeters(tenantId: string, thresholdHours: number): Promise<StaleMeterRow[]> {
    return this.dataSource.query(
      `SELECT
         m.id AS meter_id,
         m.name AS meter_name,
         m.building_id,
         m.tenant_id,
         mrs.last_reading_at,
         mrs.last_source,
         EXTRACT(EPOCH FROM (NOW() - COALESCE(mrs.last_reading_at, m.created_at))) / 3600 AS stale_hours
       FROM meters m
       LEFT JOIN meter_reading_status mrs ON mrs.meter_id = m.id
       WHERE m.tenant_id = $1
         AND m.is_active = true
         AND (
           mrs.last_reading_at IS NULL
           OR mrs.last_reading_at < NOW() - ($2 || ' hours')::interval
         )
       ORDER BY mrs.last_reading_at NULLS FIRST`,
      [tenantId, String(thresholdHours)],
    );
  }

  /**
   * Returns ingest status for a meter scoped to tenant and building access.
   */
  async getStatusForMeter(
    meterId: string,
    tenantId: string,
    buildingIds: string[],
    tenantSettings: Record<string, unknown>,
  ): Promise<MeterStatusResponse | null> {
    const params: unknown[] = [meterId, tenantId];
    let buildingClause = '';
    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${3 + i}`);
      buildingClause = `AND m.building_id IN (${placeholders.join(', ')})`;
      params.push(...buildingIds);
    }

    const rows: Array<{
      meter_id: string;
      last_reading_at: Date | null;
      last_ingested_at: Date | null;
      last_source: string | null;
    }> = await this.dataSource.query(
      `SELECT m.id AS meter_id, mrs.last_reading_at, mrs.last_ingested_at, mrs.last_source
       FROM meters m
       LEFT JOIN meter_reading_status mrs ON mrs.meter_id = m.id
       WHERE m.id = $1 AND m.tenant_id = $2 ${buildingClause}
       LIMIT 1`,
      params,
    );

    const row = rows[0];
    if (!row) return null;

    const thresholdHours = getStaleThresholdHours(tenantSettings);
    const lagSeconds = computeLagSeconds(row.last_reading_at);
    const isStale = lagSeconds === null || lagSeconds > thresholdHours * 3600;

    return {
      meterId: row.meter_id,
      lastReadingAt: row.last_reading_at ? new Date(row.last_reading_at).toISOString() : null,
      lastIngestedAt: row.last_ingested_at ? new Date(row.last_ingested_at).toISOString() : null,
      lastSource: row.last_source,
      lagSeconds,
      isStale,
      staleThresholdHours: thresholdHours,
    };
  }
}
