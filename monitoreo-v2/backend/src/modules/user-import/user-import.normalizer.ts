import type { UserImportAuthProvider } from './user-import.types';
import { buildHeaderIndex, type UserImportCanonicalColumn } from './user-import-column-map';

const BUILDING_SPLIT = /[,;|]/;

const PROVIDER_ALIASES: Record<string, UserImportAuthProvider> = {
  microsoft: 'microsoft',
  ms: 'microsoft',
  azure: 'microsoft',
  'azure ad': 'microsoft',
  google: 'google',
  gmail: 'google',
};

export interface RawImportRowCells {
  rowNumber: number;
  cells: Record<string, string>;
}

/**
 * Builds a keyed cell map from a data row using the header index.
 * @param rowNumber - 1-based spreadsheet row (excluding header)
 * @param headerIndex - Canonical column → column index
 * @param row - Raw cell values
 * @returns Row with canonical keys
 */
export function rowToCellMap(
  rowNumber: number,
  headerIndex: Map<UserImportCanonicalColumn, number>,
  row: string[],
): RawImportRowCells {
  const cells: Record<string, string> = {};
  headerIndex.forEach((colIndex, canonical) => {
    cells[canonical] = (row[colIndex] ?? '').trim();
  });
  return { rowNumber, cells };
}

/**
 * Normalizes auth provider alias to microsoft | google.
 * @param raw - Raw provider cell
 * @returns Normalized provider or null
 */
export function normalizeAuthProvider(raw: string | undefined): UserImportAuthProvider | null {
  if (!raw) {
    return null;
  }
  const key = raw.trim().toLowerCase();
  return PROVIDER_ALIASES[key] ?? null;
}

/**
 * Splits building codes field into distinct trimmed codes.
 * @param raw - Raw building_codes cell
 * @returns Unique non-empty codes preserving order
 */
export function splitBuildingCodes(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(BUILDING_SPLIT)) {
    const code = part.trim();
    if (code && !seen.has(code.toLowerCase())) {
      seen.add(code.toLowerCase());
      result.push(code);
    }
  }
  return result;
}

/**
 * Normalizes email for storage and duplicate checks.
 * @param raw - Raw email cell
 * @returns Lowercase trimmed email or null
 */
export function normalizeEmail(raw: string | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }
  return raw.trim().toLowerCase();
}

/**
 * Parses all body rows from tabular data using header mapping.
 * @param headers - Header row
 * @param rows - Data rows
 * @returns Normalized raw row cells
 */
export function parseTabularImportRows(
  headers: string[],
  rows: string[][],
): RawImportRowCells[] {
  const headerIndex = buildHeaderIndex(headers);
  return rows.map((row, index) => rowToCellMap(index + 1, headerIndex, row));
}

export { buildHeaderIndex };
