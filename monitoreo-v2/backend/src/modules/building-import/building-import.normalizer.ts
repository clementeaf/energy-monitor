import { SITE_KINDS, type SiteKind } from '../../common/constants/site-metadata';
import {
  buildHeaderIndex,
  type BuildingImportCanonicalColumn,
} from './building-import-column-map';

export interface RawBuildingImportRowCells {
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
  headerIndex: Map<BuildingImportCanonicalColumn, number>,
  row: string[],
): RawBuildingImportRowCells {
  const cells: Record<string, string> = {};
  headerIndex.forEach((colIndex, canonical) => {
    cells[canonical] = (row[colIndex] ?? '').trim();
  });
  return { rowNumber, cells };
}

/**
 * Parses optional area in square meters.
 * @param raw - Raw area cell
 * @returns Parsed number or null if empty
 */
export function parseAreaSqm(raw: string | undefined): number | null {
  if (!raw?.trim()) {
    return null;
  }
  const normalized = raw.trim().replace(',', '.');
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) {
    return Number.NaN;
  }
  return value;
}

/**
 * Normalizes ISO 3166-1 alpha-2 country code.
 * @param raw - Raw country cell
 * @returns Uppercase code or null
 */
export function normalizeCountryCode(raw: string | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }
  return raw.trim().toUpperCase();
}

/**
 * Normalizes site kind against allowed values.
 * @param raw - Raw site kind cell
 * @returns SiteKind or null if empty/invalid
 */
export function normalizeSiteKind(raw: string | undefined): SiteKind | null {
  if (!raw?.trim()) {
    return null;
  }
  const key = raw.trim().toLowerCase();
  return (SITE_KINDS as readonly string[]).includes(key) ? (key as SiteKind) : null;
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
): RawBuildingImportRowCells[] {
  const headerIndex = buildHeaderIndex(headers);
  return rows.map((row, index) => rowToCellMap(index + 1, headerIndex, row));
}

export { buildHeaderIndex };
