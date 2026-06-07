import { BadRequestException, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { ReadReplicaService } from '../../database/read-replica.service';
import { ReadingsExportQueryDto } from './dto/readings-export-query.dto';
import { EtlWatermarksService } from './etl-watermarks.service';
import {
  csvRow,
  decodeExportCursor,
  encodeExportCursor,
  READINGS_EXPORT_CSV_HEADER,
} from './lib/export-cursor';

const EXPORT_BATCH_SIZE = 500;

interface ExportReadingRow {
  id: string;
  meter_id: string;
  timestamp: string;
  power_kw: string;
  energy_kwh_total: string;
  quality: string;
  source: string | null;
  voltage_l1: string | null;
  power_factor: string | null;
  frequency_hz: string | null;
}

export interface ReadingsExportResult {
  nextCursor: string | null;
  rowCount: number;
}

/**
 * Streams readings as CSV for external ETL consumers (read replica when available).
 */
@Injectable()
export class ReadingsExportService {
  constructor(
    private readonly readReplica: ReadReplicaService,
    private readonly watermarksService: EtlWatermarksService,
  ) {}

  /**
   * Streams CSV readings export to the HTTP response.
   * @param tenantId - Tenant scope
   * @param buildingIds - Building RBAC scope
   * @param query - Export filters
   * @param res - Express response for chunked streaming
   * @param consumerId - Optional X-Consumer-Id for watermark persistence
   * @returns Row count and next cursor metadata
   */
  async streamCsvExport(
    tenantId: string,
    buildingIds: string[],
    query: ReadingsExportQueryDto,
    res: Response,
    consumerId?: string,
  ): Promise<ReadingsExportResult> {
    if (query.format !== 'csv') {
      throw new BadRequestException('Only format=csv is supported on this endpoint');
    }

    const cursor = query.cursor ? decodeExportCursor(query.cursor) : null;
    if (query.cursor && !cursor) {
      throw new BadRequestException('Invalid cursor');
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.write(`${READINGS_EXPORT_CSV_HEADER}\n`);

    let totalRows = 0;
    let lastRow: ExportReadingRow | null = null;
    let currentCursor = cursor;

    while (true) {
      const batch = await this.fetchBatch(
        tenantId,
        buildingIds,
        query.from,
        query.to,
        query.meterId,
        query.buildingId,
        currentCursor,
      );

      if (batch.length === 0) break;

      for (const row of batch) {
        res.write(`${this.rowToCsv(row)}\n`);
        totalRows += 1;
        lastRow = row;
      }

      if (batch.length < EXPORT_BATCH_SIZE) break;

      const last = batch[batch.length - 1];
      currentCursor = { timestamp: last.timestamp, id: last.id };
    }

    let nextCursor: string | null = null;
    if (lastRow) {
      nextCursor = encodeExportCursor(lastRow.timestamp, lastRow.id);
      res.setHeader('X-Next-Cursor', nextCursor);
    }

    if (consumerId && nextCursor) {
      await this.watermarksService.upsertCursor(consumerId, tenantId, nextCursor);
    }

    res.end();
    return { nextCursor, rowCount: totalRows };
  }

  /**
   * Fetches all readings in range for async export jobs.
   */
  async fetchAllForExport(
    tenantId: string,
    buildingIds: string[],
    params: {
      from: string;
      to: string;
      meterId?: string;
      buildingId?: string;
    },
  ): Promise<ExportReadingRow[]> {
    const all: ExportReadingRow[] = [];
    let cursor: { timestamp: string; id: string } | null = null;

    while (true) {
      const batch = await this.fetchBatch(
        tenantId,
        buildingIds,
        params.from,
        params.to,
        params.meterId,
        params.buildingId,
        cursor,
      );
      all.push(...batch);
      if (batch.length < EXPORT_BATCH_SIZE) break;
      const last = batch[batch.length - 1];
      cursor = { timestamp: last.timestamp, id: last.id };
    }

    return all;
  }

  /**
   * Fetches one page of readings for export.
   */
  private async fetchBatch(
    tenantId: string,
    buildingIds: string[],
    from: string,
    to: string,
    meterId: string | undefined,
    buildingId: string | undefined,
    cursor: { timestamp: string; id: string } | null,
  ): Promise<ExportReadingRow[]> {
    const params: unknown[] = [tenantId, from, to];
    const conditions = [
      'r.tenant_id = $1',
      'r.timestamp >= $2::timestamptz',
      'r.timestamp < $3::timestamptz',
    ];

    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${params.length + 1 + i}`);
      conditions.push(`m.building_id IN (${placeholders.join(', ')})`);
      params.push(...buildingIds);
    }

    if (buildingId) {
      params.push(buildingId);
      conditions.push(`m.building_id = $${params.length}`);
    }

    if (meterId) {
      params.push(meterId);
      conditions.push(`r.meter_id = $${params.length}`);
    }

    if (cursor) {
      params.push(cursor.timestamp, cursor.id);
      const tsIdx = params.length - 1;
      const idIdx = params.length;
      conditions.push(
        `(r.timestamp, r.id) > ($${tsIdx}::timestamptz, $${idIdx}::uuid)`,
      );
    }

    params.push(EXPORT_BATCH_SIZE);

    return this.readReplica.query<ExportReadingRow[]>(
      `SELECT
         r.id::text,
         r.meter_id::text,
         r.timestamp::text,
         r.power_kw::text,
         r.energy_kwh_total::text,
         r.quality::text,
         r.source,
         r.voltage_l1::text,
         r.power_factor::text,
         r.frequency_hz::text
       FROM readings r
       INNER JOIN meters m ON m.id = r.meter_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.timestamp ASC, r.id ASC
       LIMIT $${params.length}`,
      params,
    );
  }

  /**
   * Converts a reading row to a CSV line.
   */
  private rowToCsv(row: ExportReadingRow): string {
    return csvRow([
      row.meter_id,
      row.timestamp,
      row.power_kw,
      row.energy_kwh_total,
      row.quality,
      row.source ?? '',
      row.voltage_l1 ?? '',
      row.power_factor ?? '',
      row.frequency_hz ?? '',
    ]);
  }
}
