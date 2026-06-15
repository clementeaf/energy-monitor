import { READING_QUALITIES, type ReadingQuality } from '../../common/constants/reading-quality';

const VALID_QUALITIES = new Set<string>(READING_QUALITIES);

/**
 * Parses and validates a comma-separated quality filter string.
 * Returns null when input is empty/undefined (no filter).
 */
export function parseQualityFilter(raw: string | undefined): ReadingQuality[] | null {
  if (!raw) return null;
  const values = raw.split(',').map(v => v.trim()).filter(v => VALID_QUALITIES.has(v));
  return values.length > 0 ? (values as ReadingQuality[]) : null;
}

/**
 * Builds a SQL WHERE fragment for quality filtering.
 * @param alias - table alias (e.g., 'r' or empty for unaliased)
 * @param paramIdx - current parameter index
 * @param qualities - parsed quality values
 * @returns { clause, params, nextIdx } or null when no filter
 */
export function qualityWhereFragment(
  alias: string,
  paramIdx: number,
  qualities: ReadingQuality[] | null,
): { clause: string; params: unknown[]; nextIdx: number } | null {
  if (!qualities) return null;
  const col = alias ? `${alias}.quality` : 'quality';
  return {
    clause: `${col} = ANY($${paramIdx}::reading_quality[])`,
    params: [qualities],
    nextIdx: paramIdx + 1,
  };
}
