import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  USER_IMPORT_CSV_EXTENSIONS,
  USER_IMPORT_CSV_MIMES,
  USER_IMPORT_XLSX_EXTENSIONS,
  USER_IMPORT_XLSX_MIMES,
} from './user-import.constants';
import type { UserImportFileFormat } from './user-import.types';

export type { UserImportFileFormat };

const PDF_MAGIC = '%PDF';

/**
 * Detects file format from filename and MIME type; rejects PDF and oversize buffers.
 * @param buffer - Raw file bytes
 * @param filename - Original filename
 * @param mimeType - Optional MIME type from upload
 * @returns csv or xlsx
 */
export function detectUserImportFormat(
  buffer: Buffer,
  filename: string,
  mimeType?: string,
): UserImportFileFormat {
  if (buffer.length > MAX_IMPORT_BYTES) {
    throw new BadRequestException(`File exceeds ${MAX_IMPORT_BYTES} bytes limit`);
  }
  if (buffer.subarray(0, 4).toString('utf8') === PDF_MAGIC) {
    throw new BadRequestException('PDF not supported; export to CSV or XLSX');
  }

  const lower = filename.toLowerCase();
  const mime = (mimeType ?? '').toLowerCase();

  if (USER_IMPORT_XLSX_EXTENSIONS.some((ext) => lower.endsWith(ext)) || USER_IMPORT_XLSX_MIMES.has(mime)) {
    return 'xlsx';
  }
  if (USER_IMPORT_CSV_EXTENSIONS.some((ext) => lower.endsWith(ext)) || USER_IMPORT_CSV_MIMES.has(mime) || mime === '') {
    return 'csv';
  }

  throw new BadRequestException('Unsupported format; use CSV or XLSX');
}

/**
 * Parses CSV buffer into header + data rows (sync).
 * @param buffer - CSV file bytes
 * @returns Header row and data rows as string arrays
 */
export function parseCsvToRows(buffer: Buffer): { headers: string[]; rows: string[][] } {
  const text = stripUtf8Bom(buffer.toString('utf8'));
  const delimiter = detectCsvDelimiter(text);
  const records = parse(text, {
    delimiter,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];

  if (records.length === 0) {
    throw new BadRequestException('CSV file is empty');
  }

  const [headers, ...rows] = records;
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`CSV exceeds ${MAX_IMPORT_ROWS} row limit`);
  }

  return { headers, rows };
}

/**
 * Parses XLSX buffer (first sheet only) into header + data rows.
 * @param buffer - XLSX file bytes
 * @returns Header row and data rows
 */
export async function parseXlsxToRows(buffer: Buffer): Promise<{ headers: string[]; rows: string[][] }> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS typings expect legacy Buffer; Node 20 Buffer is Uint8Array-backed.
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheetsWithData = workbook.worksheets.filter((sheet) => sheetHasData(sheet));
  if (sheetsWithData.length === 0) {
    throw new BadRequestException('XLSX file has no data');
  }
  if (sheetsWithData.length > 1) {
    throw new BadRequestException('XLSX must contain data on a single sheet only');
  }

  const sheet = sheetsWithData[0];
  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as (string | number | null | undefined)[];
    const cells = values.slice(1).map((cell) => stringifyCell(cell));
    matrix.push(cells);
  });

  if (matrix.length === 0) {
    throw new BadRequestException('XLSX file is empty');
  }

  const [headers, ...rows] = matrix;
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`XLSX exceeds ${MAX_IMPORT_ROWS} row limit`);
  }

  return { headers, rows };
}

/**
 * Parses upload buffer to tabular rows based on format.
 * @param buffer - File bytes
 * @param format - csv or xlsx
 * @returns Headers and body rows
 */
export async function parseFileToRows(
  buffer: Buffer,
  format: UserImportFileFormat,
): Promise<{ headers: string[]; rows: string[][] }> {
  if (format === 'csv') {
    return parseCsvToRows(buffer);
  }
  return parseXlsxToRows(buffer);
}

/**
 * Removes UTF-8 BOM prefix when present.
 * @param text - Decoded CSV text
 * @returns Text without BOM
 */
function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Picks comma or semicolon delimiter from the header line.
 * @param text - Full CSV text
 * @returns Delimiter character
 */
function detectCsvDelimiter(text: string): ',' | ';' {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

/**
 * Checks whether a worksheet contains at least one non-empty cell.
 * @param sheet - ExcelJS worksheet
 * @returns true if sheet has data
 */
function sheetHasData(sheet: ExcelJS.Worksheet): boolean {
  let found = false;
  sheet.eachRow({ includeEmpty: false }, () => {
    found = true;
  });
  return found;
}

/**
 * Converts an Excel cell value to string.
 * @param cell - Raw cell value
 * @returns String representation
 */
function stringifyCell(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) {
    return '';
  }
  return String(cell).trim();
}
