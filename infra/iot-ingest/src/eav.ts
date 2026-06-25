import type { ParsedReading, DeviceIdentity, EavRow } from './types';

/** Default quality code for valid readings. */
const QUALITY_VALID = 0;

/**
 * Expands a ParsedReading + DeviceIdentity into one EavRow per variable.
 * Pure function, no side effects.
 */
export const toEavRows = (
  reading: ParsedReading,
  identity: DeviceIdentity,
): readonly EavRow[] =>
  Array.from(reading.variables.entries()).map(([variableName, value]) => ({
    time: reading.timestamp,
    tenantId: identity.tenantId,
    meterId: identity.meterId,
    variableName,
    value,
    quality: QUALITY_VALID,
  }));
