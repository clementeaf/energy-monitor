import * as parquet from '@dsnp/parquetjs';
import {
  csvRow,
  READINGS_EXPORT_CSV_HEADER,
} from './export-cursor';

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

const PARQUET_SCHEMA = new parquet.ParquetSchema({
  meter_id: { type: 'UTF8' },
  timestamp: { type: 'UTF8' },
  power_kw: { type: 'UTF8' },
  energy_kwh_total: { type: 'UTF8' },
  quality: { type: 'UTF8' },
  source: { type: 'UTF8', optional: true },
  voltage_l1: { type: 'UTF8', optional: true },
  power_factor: { type: 'UTF8', optional: true },
  frequency_hz: { type: 'UTF8', optional: true },
});

/**
 * Serializes reading rows to CSV bytes.
 * @param rows - Export rows
 * @returns UTF-8 CSV buffer
 */
export function readingsToCsvBuffer(rows: ExportReadingRow[]): Buffer {
  const lines = [READINGS_EXPORT_CSV_HEADER];
  for (const row of rows) {
    lines.push(
      csvRow([
        row.meter_id,
        row.timestamp,
        row.power_kw,
        row.energy_kwh_total,
        row.quality,
        row.source ?? '',
        row.voltage_l1 ?? '',
        row.power_factor ?? '',
        row.frequency_hz ?? '',
      ]),
    );
  }
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

/**
 * Writes reading rows to a Parquet file on disk.
 * @param filePath - Destination path
 * @param rows - Export rows
 */
export async function writeReadingsParquetFile(
  filePath: string,
  rows: ExportReadingRow[],
): Promise<void> {
  const writer = await parquet.ParquetWriter.openFile(PARQUET_SCHEMA, filePath);
  try {
    for (const row of rows) {
      await writer.appendRow({
        meter_id: row.meter_id,
        timestamp: row.timestamp,
        power_kw: row.power_kw,
        energy_kwh_total: row.energy_kwh_total,
        quality: row.quality,
        source: row.source ?? undefined,
        voltage_l1: row.voltage_l1 ?? undefined,
        power_factor: row.power_factor ?? undefined,
        frequency_hz: row.frequency_hz ?? undefined,
      });
    }
  } finally {
    await writer.close();
  }
}

export type { ExportReadingRow };
