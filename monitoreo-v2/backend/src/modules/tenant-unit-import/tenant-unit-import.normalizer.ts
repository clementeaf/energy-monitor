import {
  buildHeaderIndex,
  type TenantUnitImportCanonicalColumn,
} from './tenant-unit-import-column-map';

export interface RawTenantUnitImportRowCells {
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
  headerIndex: Map<TenantUnitImportCanonicalColumn, number>,
  row: string[],
): RawTenantUnitImportRowCells {
  const cells: Record<string, string> = {};
  headerIndex.forEach((colIndex, canonical) => {
    cells[canonical] = (row[colIndex] ?? '').trim();
  });
  return { rowNumber, cells };
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
): RawTenantUnitImportRowCells[] {
  const headerIndex = buildHeaderIndex(headers);
  return rows.map((row, index) => rowToCellMap(index + 1, headerIndex, row));
}

export { buildHeaderIndex };
