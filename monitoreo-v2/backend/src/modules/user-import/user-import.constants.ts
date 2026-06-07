/** Maximum rows accepted per import file (SPEC IMP-010). */
export const MAX_IMPORT_ROWS = 500;

/** Maximum upload size in bytes (1 MiB). */
export const MAX_IMPORT_BYTES = 1_048_576;

/** Supported file extensions and MIME hints. */
export const USER_IMPORT_CSV_EXTENSIONS = ['.csv'] as const;
export const USER_IMPORT_XLSX_EXTENSIONS = ['.xlsx'] as const;

export const USER_IMPORT_CSV_MIMES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
]);

export const USER_IMPORT_XLSX_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

/** Placeholder until first OAuth login. */
export const PENDING_IMPORT_AUTH_PROVIDER_ID = 'pending-import';
