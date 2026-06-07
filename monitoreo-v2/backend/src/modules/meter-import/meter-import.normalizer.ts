import { LOAD_CATEGORIES, type LoadCategory } from '../../common/constants/site-metadata';
import type { MeterPhaseType } from '../platform/entities/meter.entity';
import {
  buildHeaderIndex,
  type MeterImportCanonicalColumn,
} from './meter-import-column-map';

export interface RawMeterImportRowCells {
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
  headerIndex: Map<MeterImportCanonicalColumn, number>,
  row: string[],
): RawMeterImportRowCells {
  const cells: Record<string, string> = {};
  headerIndex.forEach((colIndex, canonical) => {
    cells[canonical] = (row[colIndex] ?? '').trim();
  });
  return { rowNumber, cells };
}

/**
 * Normalizes phase type against allowed meter values.
 * @param raw - Raw phase cell
 * @returns MeterPhaseType or null if empty/invalid
 */
export function normalizePhaseType(raw: string | undefined): MeterPhaseType | null {
  if (!raw?.trim()) {
    return null;
  }
  const key = raw.trim().toLowerCase();
  if (key === 'single_phase' || key === '1p' || key === 'monofasico' || key === 'monofásico') {
    return 'single_phase';
  }
  if (key === 'three_phase' || key === '3p' || key === 'trifasico' || key === 'trifásico') {
    return 'three_phase';
  }
  return null;
}

/**
 * Normalizes load category against allowed values.
 * @param raw - Raw load category cell
 * @returns LoadCategory or null if empty/invalid
 */
export function normalizeLoadCategory(raw: string | undefined): LoadCategory | null {
  if (!raw?.trim()) {
    return null;
  }
  const key = raw.trim().toLowerCase();
  return (LOAD_CATEGORIES as readonly string[]).includes(key) ? (key as LoadCategory) : null;
}

/**
 * Parses optional modbus address.
 * @param raw - Raw modbus cell
 * @returns Parsed integer or null if empty
 */
export function parseModbusAddress(raw: string | undefined): number | null {
  if (!raw?.trim()) {
    return null;
  }
  const value = Number.parseInt(raw.trim(), 10);
  if (Number.isNaN(value)) {
    return Number.NaN;
  }
  return value;
}

/**
 * Parses optional is_active boolean.
 * @param raw - Raw active cell
 * @returns Boolean or null if empty
 */
export function parseIsActive(raw: string | undefined): boolean | null {
  if (!raw?.trim()) {
    return null;
  }
  const key = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí', 'activo', 'active'].includes(key)) {
    return true;
  }
  if (['false', '0', 'no', 'inactivo', 'inactive'].includes(key)) {
    return false;
  }
  return null;
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
): RawMeterImportRowCells[] {
  const headerIndex = buildHeaderIndex(headers);
  return rows.map((row, index) => rowToCellMap(index + 1, headerIndex, row));
}

export { buildHeaderIndex };
