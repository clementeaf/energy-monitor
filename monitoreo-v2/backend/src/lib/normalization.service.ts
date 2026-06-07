import { Injectable } from '@nestjs/common';
import type { ReadingTargetField } from '../common/constants/protocol-mapping';

export interface RegisterMappingInput {
  registerKey: string;
  targetField: ReadingTargetField | string;
  scaleFactor: number;
  unit?: string | null;
}

export type NormalizedReadingFields = Partial<Record<ReadingTargetField | string, number>>;

/**
 * Coerces unknown raw values to finite numbers.
 * @param value - Raw register value
 * @returns Numeric value or null when not coercible
 */
function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Applies register mapping rules to raw protocol values.
 */
@Injectable()
export class NormalizationService {
  /**
   * Maps raw register values to normalized reading fields.
   * @param mappings - Mapping rules for a device profile
   * @param raw - Raw key/value pairs from protocol ingest
   * @returns Normalized numeric fields keyed by target_field
   */
  apply(
    mappings: RegisterMappingInput[],
    raw: Record<string, unknown>,
  ): NormalizedReadingFields {
    const result: NormalizedReadingFields = {};
    const byKey = new Map(mappings.map((m) => [m.registerKey, m]));

    for (const [registerKey, rawValue] of Object.entries(raw)) {
      const mapping = byKey.get(registerKey);
      if (!mapping) continue;

      const numeric = coerceNumber(rawValue);
      if (numeric === null) continue;

      result[mapping.targetField] = numeric * mapping.scaleFactor;
    }

    return result;
  }
}
