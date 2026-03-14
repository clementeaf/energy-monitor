import { BadRequestException } from '@nestjs/common';

/** Maximum range in days for time-series queries. */
const MAX_RANGE_DAYS = 31;
const MAX_RANGE_MS = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;

export interface ValidatedRange {
  from: string;
  to: string;
}

/**
 * Validates and enforces a date range on API queries.
 * - from and to must be valid ISO dates
 * - to must be after from
 * - Range cannot exceed MAX_RANGE_DAYS
 * Throws BadRequestException if invalid.
 */
export function enforceRange(from?: string, to?: string): ValidatedRange {
  if (!from || !to) {
    throw new BadRequestException('from and to query parameters are required');
  }

  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();

  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    throw new BadRequestException('from and to must be valid ISO 8601 dates');
  }

  if (toMs <= fromMs) {
    throw new BadRequestException('to must be after from');
  }

  if (toMs - fromMs > MAX_RANGE_MS) {
    throw new BadRequestException(`Range cannot exceed ${MAX_RANGE_DAYS} days`);
  }

  return { from, to };
}

/**
 * Like enforceRange but allows optional from/to. Returns null if neither provided.
 * If only one is provided, throws.
 */
export function enforceOptionalRange(from?: string, to?: string): ValidatedRange | null {
  if (!from && !to) return null;
  return enforceRange(from, to);
}
