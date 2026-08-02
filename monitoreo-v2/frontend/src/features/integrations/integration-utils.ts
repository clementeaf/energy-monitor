import { isAxiosError } from 'axios';
import type {
  IntegrationStatus,
  IntegrationSyncLog,
} from '../../types/integration';

/* ── Constants ── */

export const STATUS_OPTIONS: { value: IntegrationStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'error', label: 'Error' },
  { value: 'pending', label: 'Pendiente' },
];

export const SYNC_STATUS_LABELS: Record<IntegrationSyncLog['status'], string> = {
  success: 'Correcto',
  partial: 'Parcial',
  failed: 'Fallido',
};

/* ── Utility functions ── */

/**
 * Type guard: plain object (not array) for JSON `config` payloads.
 * @param value - Parsed JSON value
 */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validates and parses JSON config as a plain object for API payloads.
 * @param raw - User-entered JSON string
 * @returns Record for `config` field
 */
export function parseConfigObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return {};
  }
  const parsed: unknown = JSON.parse(trimmed);
  if (!isPlainRecord(parsed)) {
    throw new Error('La configuracion debe ser un objeto JSON (no un array ni un valor simple).');
  }
  return parsed;
}

/**
 * Returns the Spanish label for an integration status value.
 * @param s - Status enum value
 */
export function labelStatus(s: IntegrationStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

/**
 * Normalizes API or runtime errors to a single message string.
 * @param err - Thrown value from mutation or parse
 */
export function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (data?.message != null) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
  }
  if (err instanceof Error) return err.message;
  return 'Error desconocido';
}
