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
   * Ejecuta el diagnóstico por tramos (por source_file) para no colapsar con tablas de millones de filas.
   * Evita JOINs masivos: cada archivo se consulta por separado usando índice en source_file.
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

    const stagingFiles = await this.getStagingSummaryByFileChunked();
    if (stagingFiles.length === 0) {
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

    const stagingTotalRows = stagingFiles.reduce((sum, f) => sum + f.rowCount, 0);

    const { stagingMeterIds, perFileMatch, readingsMatchedCount } = await this.processByFile(stagingFiles);
    const readingsTotalForStagingMeters =
      stagingMeterIds.length > 0 ? await this.getReadingsTotalForStagingMeters(stagingMeterIds) : 0;

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

  /**
   * Lista de source_file sin barrer toda la tabla: usa índice si existe en source_file.
   */
  private async getStagingSourceFiles(): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ source_file: string }>>(
      'SELECT DISTINCT source_file FROM readings_import_staging ORDER BY source_file',
    );
    return rows.map((r) => r.source_file);
  }

  /**
   * Resumen por archivo en tramos: una query por source_file (índice; no colapsa con millones de filas).
   */
  private async getStagingSummaryByFileChunked(): Promise<DriveIngestFileSummary[]> {
    const files = await this.getStagingSourceFiles();
    if (files.length === 0) return [];

    const summaries: DriveIngestFileSummary[] = [];
    for (const sourceFile of files) {
      const rows = await this.dataSource.query<
        Array<{ row_count: string; meter_count: string; min_ts: string; max_ts: string }>
      >(
        `SELECT
          COUNT(*)::bigint AS row_count,
          COUNT(DISTINCT meter_id)::int AS meter_count,
          MIN(timestamp)::text AS min_ts,
          MAX(timestamp)::text AS max_ts
         FROM readings_import_staging
         WHERE source_file = $1`,
        [sourceFile],
      );
      const r = rows[0];
      if (r)
        summaries.push({
          sourceFile,
          rowCount: Number(r.row_count),
          meterCount: Number(r.meter_count),
          minTimestamp: r.min_ts,
          maxTimestamp: r.max_ts,
        });
    }
    return summaries;
  }

  /**
   * Procesa por tramo (cada source_file): meter_ids, matched count y perFileMatch.
   * Cada query filtra por source_file para usar índice y no colapsar el servicio.
   */
  private async processByFile(
    stagingFiles: DriveIngestFileSummary[],
  ): Promise<{ stagingMeterIds: string[]; perFileMatch: DriveIngestFileMatch[]; readingsMatchedCount: number }> {
    const meterIdSet = new Set<string>();
    const perFileMatch: DriveIngestFileMatch[] = [];
    let readingsMatchedCount = 0;

    for (const file of stagingFiles) {
      const [meterIds, matched] = await Promise.all([
        this.getMeterIdsForFile(file.sourceFile),
        this.getMatchedCountForFile(file.sourceFile),
      ]);
      meterIds.forEach((id) => meterIdSet.add(id));
      const stagingRows = file.rowCount;
      const missing = stagingRows - matched;
      const matchPercent = stagingRows > 0 ? (matched / stagingRows) * 100 : 0;
      perFileMatch.push({
        sourceFile: file.sourceFile,
        stagingRows,
        matchedInReadings: matched,
        missingInReadings: missing,
        matchPercent: Math.round(matchPercent * 10) / 10,
      });
      readingsMatchedCount += matched;
    }

    return {
      stagingMeterIds: Array.from(meterIdSet).sort(),
      perFileMatch,
      readingsMatchedCount,
    };
  }

  private async getMeterIdsForFile(sourceFile: string): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ meter_id: string }>>(
      'SELECT DISTINCT meter_id FROM readings_import_staging WHERE source_file = $1 ORDER BY meter_id',
      [sourceFile],
    );
    return rows.map((r) => r.meter_id);
  }

  private async getMatchedCountForFile(sourceFile: string): Promise<number> {
    const result = await this.dataSource.query<Array<{ cnt: string }>>(
      `SELECT COUNT(*)::bigint AS cnt
       FROM readings_import_staging s
       INNER JOIN readings r ON r.meter_id = s.meter_id AND r.timestamp = s.timestamp
       WHERE s.source_file = $1`,
      [sourceFile],
    );
    return Number(result[0]?.cnt ?? 0);
  }

  private async getReadingsTotalForStagingMeters(meterIds: string[]): Promise<number> {
    if (meterIds.length === 0) return 0;
    const result = await this.dataSource.query<Array<{ cnt: string }>>(
      'SELECT COUNT(*)::bigint AS cnt FROM readings r WHERE r.meter_id = ANY($1::text[])',
      [meterIds],
    );
    return Number(result[0]?.cnt ?? 0);
  }
}
