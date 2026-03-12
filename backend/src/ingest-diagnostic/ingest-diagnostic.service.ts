/**
 * Compara datos en readings_import_staging (origen Google Drive) con readings (consumidos por backend).
 * Informa si la data servida por el backend corresponde en totalidad a lo obtenido de Drive.
 */

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface DriveIngestFileSummary {
  sourceFile: string;
  rowCount: number;
  meterCount: number;
  minTimestamp: string;
  maxTimestamp: string;
}

export interface DriveIngestFileMatch {
  sourceFile: string;
  stagingRows: number;
  matchedInReadings: number;
  missingInReadings: number;
  matchPercent: number;
}

export interface DriveIngestDiagnosticResult {
  hasStagingTable: boolean;
  stagingTotalRows: number;
  stagingFiles: DriveIngestFileSummary[];
  stagingMeterIds: string[];
  readingsMatchedCount: number;
  readingsTotalForStagingMeters: number;
  perFileMatch: DriveIngestFileMatch[];
  conclusion: 'full_match' | 'partial_match' | 'mismatch' | 'no_staging_data';
  message: string;
  generatedAt: string;
}

@Injectable()
export class IngestDiagnosticService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Ejecuta el diagnóstico completo: staging (Drive) vs readings (backend).
   * Determina si la data consumida por el backend corresponde en totalidad a lo obtenido de Google Drive.
   */
  async runDiagnostic(): Promise<DriveIngestDiagnosticResult> {
    const generatedAt = new Date().toISOString();

    const hasStagingTable = await this.checkStagingTableExists();
    if (!hasStagingTable) {
      return {
        hasStagingTable: false,
        stagingTotalRows: 0,
        stagingFiles: [],
        stagingMeterIds: [],
        readingsMatchedCount: 0,
        readingsTotalForStagingMeters: 0,
        perFileMatch: [],
        conclusion: 'no_staging_data',
        message: 'La tabla readings_import_staging no existe. No hay datos de Google Drive importados.',
        generatedAt,
      };
    }

    const stagingTotalRows = await this.getStagingTotalRows();
    if (stagingTotalRows === 0) {
      return {
        hasStagingTable: true,
        stagingTotalRows: 0,
        stagingFiles: [],
        stagingMeterIds: [],
        readingsMatchedCount: 0,
        readingsTotalForStagingMeters: 0,
        perFileMatch: [],
        conclusion: 'no_staging_data',
        message: 'readings_import_staging está vacía. No hay datos de Google Drive en staging.',
        generatedAt,
      };
    }

    const [stagingFiles, stagingMeterIds, readingsMatchedCount, readingsTotalForStagingMeters, perFileMatch] =
      await Promise.all([
        this.getStagingSummaryByFile(),
        this.getStagingMeterIds(),
        this.getReadingsMatchedCount(),
        this.getReadingsTotalForStagingMeters(),
        this.getPerFileMatch(),
      ]);

    const missingTotal = stagingTotalRows - readingsMatchedCount;
    let conclusion: DriveIngestDiagnosticResult['conclusion'];
    let message: string;

    if (missingTotal === 0) {
      conclusion = 'full_match';
      message = `El 100% de los datos obtenidos de Google Drive (${stagingTotalRows.toLocaleString('es-CL')} filas) está presente en readings y es consumido por el backend.`;
    } else if (readingsMatchedCount === 0) {
      conclusion = 'mismatch';
      message = `Ninguna fila de staging tiene correspondencia en readings. Posible promoción no ejecutada o meter_id/timestamp no coinciden.`;
    } else {
      conclusion = 'partial_match';
      const pct = ((readingsMatchedCount / stagingTotalRows) * 100).toFixed(1);
      message = `Correspondencia parcial: ${readingsMatchedCount.toLocaleString('es-CL')} de ${stagingTotalRows.toLocaleString('es-CL')} filas de Drive (${pct}%) están en readings. Faltan ${missingTotal.toLocaleString('es-CL')} filas.`;
    }

    return {
      hasStagingTable: true,
      stagingTotalRows,
      stagingFiles,
      stagingMeterIds,
      readingsMatchedCount,
      readingsTotalForStagingMeters,
      perFileMatch,
      conclusion,
      message,
      generatedAt,
    };
  }

  private async checkStagingTableExists(): Promise<boolean> {
    const result = await this.dataSource.query<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'readings_import_staging'
      ) AS exists`,
    );
    return result[0]?.exists === true;
  }

  private async getStagingTotalRows(): Promise<number> {
    const result = await this.dataSource.query<Array<{ total: string }>>(
      'SELECT COUNT(*)::bigint AS total FROM readings_import_staging',
    );
    return Number(result[0]?.total ?? 0);
  }

  private async getStagingSummaryByFile(): Promise<DriveIngestFileSummary[]> {
    const rows = await this.dataSource.query<
      { source_file: string; row_count: string; meter_count: string; min_ts: string; max_ts: string }[]
    >(
      `SELECT
        source_file,
        COUNT(*)::bigint AS row_count,
        COUNT(DISTINCT meter_id)::int AS meter_count,
        MIN(timestamp)::text AS min_ts,
        MAX(timestamp)::text AS max_ts
       FROM readings_import_staging
       GROUP BY source_file
       ORDER BY source_file`,
    );
    return rows.map((r) => ({
      sourceFile: r.source_file,
      rowCount: Number(r.row_count),
      meterCount: Number(r.meter_count),
      minTimestamp: r.min_ts,
      maxTimestamp: r.max_ts,
    }));
  }

  private async getStagingMeterIds(): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ meter_id: string }>>(
      'SELECT DISTINCT meter_id FROM readings_import_staging ORDER BY meter_id',
    );
    return rows.map((r: { meter_id: string }) => r.meter_id);
  }

  private async getReadingsMatchedCount(): Promise<number> {
    const result = await this.dataSource.query<Array<{ cnt: string }>>(
      `SELECT COUNT(*)::bigint AS cnt
       FROM readings_import_staging s
       INNER JOIN readings r ON r.meter_id = s.meter_id AND r.timestamp = s.timestamp`,
    );
    return Number(result[0]?.cnt ?? 0);
  }

  private async getReadingsTotalForStagingMeters(): Promise<number> {
    const result = await this.dataSource.query<Array<{ cnt: string }>>(
      `SELECT COUNT(*)::bigint AS cnt
       FROM readings r
       WHERE r.meter_id IN (SELECT DISTINCT meter_id FROM readings_import_staging)`,
    );
    return Number(result[0]?.cnt ?? 0);
  }

  private async getPerFileMatch(): Promise<DriveIngestFileMatch[]> {
    type PerFileRow = { source_file: string; staging_rows: string; matched: string };
    const rows = await this.dataSource.query<PerFileRow[]>(
      `SELECT
        s.source_file,
        COUNT(DISTINCT s.id)::bigint AS staging_rows,
        COUNT(DISTINCT r.id)::bigint AS matched
       FROM readings_import_staging s
       LEFT JOIN readings r ON r.meter_id = s.meter_id AND r.timestamp = s.timestamp
       GROUP BY s.source_file
       ORDER BY s.source_file`,
    );
    return rows.map((r) => {
      const stagingRows = Number(r.staging_rows);
      const matched = Number(r.matched);
      const missing = stagingRows - matched;
      const matchPercent = stagingRows > 0 ? (matched / stagingRows) * 100 : 0;
      return {
        sourceFile: r.source_file,
        stagingRows,
        matchedInReadings: matched,
        missingInReadings: missing,
        matchPercent: Math.round(matchPercent * 10) / 10,
      };
    });
  }
}
