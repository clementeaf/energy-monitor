export type MeterRole = 'generation' | 'load';

/** SQL predicate matching frontend `isGenerationMeterType` (alias `m` required). */
export const GENERATION_METER_WHERE = `(
  LOWER(TRIM(m.meter_type)) IN ('generation', 'solar', 'pv', 'inverter')
  OR LOWER(m.meter_type) LIKE '%generacion%'
  OR LOWER(m.meter_type) LIKE '%generación%'
  OR LOWER(m.meter_type) LIKE '%solar%'
  OR LOWER(m.meter_type) LIKE '%fotovolta%'
)`;

/**
 * Returns SQL filter for generation or load meters.
 * @param role - generation or load (inverse of generation predicate)
 * @returns WHERE fragment without leading AND
 */
export function meterRoleWhereClause(role: MeterRole): string {
  return role === 'generation' ? GENERATION_METER_WHERE : `NOT ${GENERATION_METER_WHERE}`;
}
