import { isAxiosError } from 'axios';
import type {
  Integration,
  IntegrationStatus,
  IntegrationSyncLog,
} from '../../types/integration';

/* ── Fallback data ── */

export const FALLBACK_INTEGRATIONS: Integration[] = [
  {
    id: 'fb-int-1', tenantId: 'fb-t1', name: 'API Facturación PASA', integrationType: 'rest_api',
    status: 'active', config: { endpoint: 'https://api.pasa.cl/billing' }, lastSyncAt: new Date(Date.now() - 15 * 60_000).toISOString(),
    errorMessage: null, createdAt: '2025-06-01T00:00:00Z', updatedAt: '2026-07-13T00:00:00Z',
  },
  {
    id: 'fb-int-2', tenantId: 'fb-t1', name: 'Azure AD SSO PASA', integrationType: 'oauth_azure',
    status: 'active', config: { tenantId: 'pasa.onmicrosoft.com' }, lastSyncAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    errorMessage: null, createdAt: '2025-06-15T00:00:00Z', updatedAt: '2026-07-10T00:00:00Z',
  },
  {
    id: 'fb-int-3', tenantId: 'fb-t2', name: 'Drive Pipeline PASA', integrationType: 'google_drive',
    status: 'error', config: { folderId: '1VwbEPmoB1fXvhJT' }, lastSyncAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    errorMessage: 'Token expirado — se requiere re-autorización', createdAt: '2025-04-01T00:00:00Z', updatedAt: '2026-07-07T00:00:00Z',
  },
];

export const FALLBACK_SYNC_LOGS: IntegrationSyncLog[] = [
  { id: 'fb-sl-1', integrationId: 'fb-int-1', status: 'success', recordsSynced: 1842, errorMessage: null, startedAt: new Date(Date.now() - 15 * 60_000).toISOString(), completedAt: new Date(Date.now() - 14 * 60_000).toISOString(), createdAt: new Date(Date.now() - 15 * 60_000).toISOString() },
  { id: 'fb-sl-2', integrationId: 'fb-int-1', status: 'success', recordsSynced: 1756, errorMessage: null, startedAt: new Date(Date.now() - 75 * 60_000).toISOString(), completedAt: new Date(Date.now() - 74 * 60_000).toISOString(), createdAt: new Date(Date.now() - 75 * 60_000).toISOString() },
  { id: 'fb-sl-3', integrationId: 'fb-int-1', status: 'partial', recordsSynced: 943, errorMessage: 'Timeout en 3 registros batch', startedAt: new Date(Date.now() - 135 * 60_000).toISOString(), completedAt: new Date(Date.now() - 134 * 60_000).toISOString(), createdAt: new Date(Date.now() - 135 * 60_000).toISOString() },
  { id: 'fb-sl-4', integrationId: 'fb-int-3', status: 'failed', recordsSynced: 0, errorMessage: 'Token expirado — se requiere re-autorización', startedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(), completedAt: new Date(Date.now() - 3 * 86_400_000 + 5000).toISOString(), createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() },
];

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
