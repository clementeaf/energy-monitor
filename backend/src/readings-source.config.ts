/**
 * Configuración para usar readings_import_staging como fuente del frontend.
 * Límites por defecto y máximos para no enviar millones de filas.
 */
export const READINGS_SOURCE = (process.env.READINGS_SOURCE ?? 'readings') as 'readings' | 'staging';

export const STAGING_LIMITS = {
  /** Límite por defecto de filas por consulta (time series, raw). */
  defaultMaxRows: 5000,
  /** Límite máximo permitido por consulta. */
  maxRowsPerQuery: 50000,
  /** Rango máximo en días cuando from/to se envían (evita ventanas enormes). */
  maxRangeDays: 90,
} as const;

export function useStaging(): boolean {
  return READINGS_SOURCE === 'staging';
}

export function clampStagingLimit(requested: number | undefined): number {
  const max = requested != null ? Math.min(requested, STAGING_LIMITS.maxRowsPerQuery) : STAGING_LIMITS.defaultMaxRows;
  return Math.min(Math.max(1, max), STAGING_LIMITS.maxRowsPerQuery);
}

export function getStagingLimitFromQuery(limitParam: string | undefined): number {
  const n = limitParam != null ? parseInt(limitParam, 10) : NaN;
  return clampStagingLimit(Number.isNaN(n) ? undefined : n);
}
