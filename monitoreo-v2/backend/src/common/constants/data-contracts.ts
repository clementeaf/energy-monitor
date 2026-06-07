/** Default export contract identifier for readings ETL (GAP-165). */
export const READINGS_EXPORT_CONTRACT = {
  name: 'readings-export',
  version: '1.0.0',
} as const;

/** Header carrying contract name@semver for export validation (GAP-166). */
export const DATA_CONTRACT_VERSION_HEADER = 'x-data-contract-version';

/**
 * Parses `name@version` contract header value.
 * @param header - Raw header string
 * @returns Parsed parts or null when invalid
 */
export function parseContractHeader(header: string): { name: string; version: string } | null {
  const trimmed = header.trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return null;
  const name = trimmed.slice(0, at);
  const version = trimmed.slice(at + 1);
  if (name.length === 0 || version.length === 0) return null;
  return { name, version };
}

/**
 * Builds canonical contract header value.
 * @param name - Contract name
 * @param version - Semver string
 * @returns name@version
 */
export function formatContractHeader(name: string, version: string): string {
  return `${name}@${version}`;
}
