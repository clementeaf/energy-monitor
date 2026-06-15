export const DEFAULT_RETENTION_YEARS = 5;
export const DEFAULT_STALE_THRESHOLD_HOURS = 4;
export const MIN_STALE_THRESHOLD_HOURS = 1;
export const MAX_STALE_THRESHOLD_HOURS = 72;
export const MIN_RETENTION_YEARS = 1;
export const MAX_RETENTION_YEARS = 10;
export const MIN_SESSION_MINUTES = 5;
export const MAX_SESSION_MINUTES = 1440;
export const DEFAULT_IDLE_TIMEOUT_MINUTES = 15;
export const MIN_IDLE_TIMEOUT_MINUTES = 5;
export const MAX_IDLE_TIMEOUT_MINUTES = 60;
export const DEFAULT_SSO_DEFAULT_ROLE_SLUG = 'operator';

export type SsoProvider = 'azure_ad' | 'oidc';

const RETENTION_YEARS_KEY = 'retentionYears';
const STALE_THRESHOLD_HOURS_KEY = 'staleThresholdHours';
const SSO_PROVIDER_KEY = 'ssoProvider';
const MAX_SESSION_MINUTES_KEY = 'maxSessionMinutes';
const BLOCK_CONCURRENT_SESSIONS_KEY = 'blockConcurrentSessions';
const IDLE_TIMEOUT_MINUTES_KEY = 'idleTimeoutMinutes';
const SSO_DEFAULT_ROLE_SLUG_KEY = 'ssoDefaultRoleSlug';

const VALID_SSO_PROVIDERS = new Set<string>(['azure_ad', 'oidc']);

/**
 * Returns validated retention years from tenant settings JSON (default 5).
 */
export function getRetentionYears(settings: Record<string, unknown> | null | undefined): number {
  const raw = settings?.[RETENTION_YEARS_KEY];
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= MIN_RETENTION_YEARS && raw <= MAX_RETENTION_YEARS) {
    return raw;
  }
  return DEFAULT_RETENTION_YEARS;
}

/**
 * Returns stale meter threshold hours from tenant settings (default 4).
 */
export function getStaleThresholdHours(settings: Record<string, unknown> | null | undefined): number {
  const raw = settings?.[STALE_THRESHOLD_HOURS_KEY];
  if (
    typeof raw === 'number'
    && Number.isInteger(raw)
    && raw >= MIN_STALE_THRESHOLD_HOURS
    && raw <= MAX_STALE_THRESHOLD_HOURS
  ) {
    return raw;
  }
  return DEFAULT_STALE_THRESHOLD_HOURS;
}

/**
 * Returns configured SSO provider or null when SSO is disabled for the tenant.
 */
export function getSsoProvider(settings: Record<string, unknown> | null | undefined): SsoProvider | null {
  const raw = settings?.[SSO_PROVIDER_KEY];
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string' && VALID_SSO_PROVIDERS.has(raw)) {
    return raw as SsoProvider;
  }
  return null;
}

/**
 * Resolves session duration: tenant override wins over role default.
 */
export function resolveSessionMinutes(
  settings: Record<string, unknown> | null | undefined,
  roleMaxSessionMinutes: number,
): number {
  const raw = settings?.[MAX_SESSION_MINUTES_KEY];
  if (
    typeof raw === 'number'
    && Number.isInteger(raw)
    && raw >= MIN_SESSION_MINUTES
    && raw <= MAX_SESSION_MINUTES
  ) {
    return raw;
  }
  return roleMaxSessionMinutes;
}

/**
 * Returns whether the tenant blocks concurrent refresh-token sessions.
 */
export function getBlockConcurrentSessions(settings: Record<string, unknown> | null | undefined): boolean {
  return settings?.[BLOCK_CONCURRENT_SESSIONS_KEY] === true;
}

/**
 * Returns idle timeout in minutes from tenant settings (default 15).
 */
export function getIdleTimeoutMinutes(settings: Record<string, unknown> | null | undefined): number {
  const raw = settings?.[IDLE_TIMEOUT_MINUTES_KEY];
  if (
    typeof raw === 'number'
    && Number.isInteger(raw)
    && raw >= MIN_IDLE_TIMEOUT_MINUTES
    && raw <= MAX_IDLE_TIMEOUT_MINUTES
  ) {
    return raw;
  }
  return DEFAULT_IDLE_TIMEOUT_MINUTES;
}

/**
 * Returns default role slug for JIT SSO provisioning.
 */
export function getSsoDefaultRoleSlug(settings: Record<string, unknown> | null | undefined): string {
  const raw = settings?.[SSO_DEFAULT_ROLE_SLUG_KEY];
  if (typeof raw === 'string' && raw.length > 0 && raw.length <= 50) {
    return raw;
  }
  return DEFAULT_SSO_DEFAULT_ROLE_SLUG;
}

/**
 * Validates staleThresholdHours when present in a settings patch.
 */
export function assertValidStaleThresholdHours(settings: Record<string, unknown>): void {
  if (!(STALE_THRESHOLD_HOURS_KEY in settings)) return;
  const raw = settings[STALE_THRESHOLD_HOURS_KEY];
  if (
    typeof raw !== 'number'
    || !Number.isInteger(raw)
    || raw < MIN_STALE_THRESHOLD_HOURS
    || raw > MAX_STALE_THRESHOLD_HOURS
  ) {
    throw new Error(
      `settings.staleThresholdHours must be an integer between ${MIN_STALE_THRESHOLD_HOURS} and ${MAX_STALE_THRESHOLD_HOURS}`,
    );
  }
}

/**
 * Validates retentionYears when present in a settings patch.
 */
export function assertValidRetentionYears(settings: Record<string, unknown>): void {
  if (!(RETENTION_YEARS_KEY in settings)) return;
  const raw = settings[RETENTION_YEARS_KEY];
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < MIN_RETENTION_YEARS || raw > MAX_RETENTION_YEARS) {
    throw new Error(
      `settings.retentionYears must be an integer between ${MIN_RETENTION_YEARS} and ${MAX_RETENTION_YEARS}`,
    );
  }
}

/**
 * Validates ssoProvider when present in a settings patch.
 */
export function assertValidSsoProvider(settings: Record<string, unknown>): void {
  if (!(SSO_PROVIDER_KEY in settings)) return;
  const raw = settings[SSO_PROVIDER_KEY];
  if (raw === null) return;
  if (typeof raw !== 'string' || !VALID_SSO_PROVIDERS.has(raw)) {
    throw new Error('settings.ssoProvider must be null, "azure_ad", or "oidc"');
  }
}

/**
 * Validates maxSessionMinutes when present in a settings patch.
 */
export function assertValidMaxSessionMinutes(settings: Record<string, unknown>): void {
  if (!(MAX_SESSION_MINUTES_KEY in settings)) return;
  const raw = settings[MAX_SESSION_MINUTES_KEY];
  if (
    typeof raw !== 'number'
    || !Number.isInteger(raw)
    || raw < MIN_SESSION_MINUTES
    || raw > MAX_SESSION_MINUTES
  ) {
    throw new Error(
      `settings.maxSessionMinutes must be an integer between ${MIN_SESSION_MINUTES} and ${MAX_SESSION_MINUTES}`,
    );
  }
}

/**
 * Validates blockConcurrentSessions when present in a settings patch.
 */
export function assertValidBlockConcurrentSessions(settings: Record<string, unknown>): void {
  if (!(BLOCK_CONCURRENT_SESSIONS_KEY in settings)) return;
  if (typeof settings[BLOCK_CONCURRENT_SESSIONS_KEY] !== 'boolean') {
    throw new Error('settings.blockConcurrentSessions must be a boolean');
  }
}

/**
 * Validates idleTimeoutMinutes when present in a settings patch.
 */
export function assertValidIdleTimeoutMinutes(settings: Record<string, unknown>): void {
  if (!(IDLE_TIMEOUT_MINUTES_KEY in settings)) return;
  const raw = settings[IDLE_TIMEOUT_MINUTES_KEY];
  if (
    typeof raw !== 'number'
    || !Number.isInteger(raw)
    || raw < MIN_IDLE_TIMEOUT_MINUTES
    || raw > MAX_IDLE_TIMEOUT_MINUTES
  ) {
    throw new Error(
      `settings.idleTimeoutMinutes must be an integer between ${MIN_IDLE_TIMEOUT_MINUTES} and ${MAX_IDLE_TIMEOUT_MINUTES}`,
    );
  }
}

/**
 * Validates ssoDefaultRoleSlug when present in a settings patch.
 */
export function assertValidSsoDefaultRoleSlug(settings: Record<string, unknown>): void {
  if (!(SSO_DEFAULT_ROLE_SLUG_KEY in settings)) return;
  const raw = settings[SSO_DEFAULT_ROLE_SLUG_KEY];
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 50) {
    throw new Error('settings.ssoDefaultRoleSlug must be a non-empty string up to 50 chars');
  }
}

/**
 * Merges tenant settings and ensures retentionYears default when missing.
 */
export function mergeTenantSettings(
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  assertValidRetentionYears(patch);
  assertValidStaleThresholdHours(patch);
  assertValidSsoProvider(patch);
  assertValidMaxSessionMinutes(patch);
  assertValidBlockConcurrentSessions(patch);
  assertValidIdleTimeoutMinutes(patch);
  assertValidSsoDefaultRoleSlug(patch);
  const merged: Record<string, unknown> = { ...current, ...patch };
  if (merged[RETENTION_YEARS_KEY] === undefined) {
    merged[RETENTION_YEARS_KEY] = DEFAULT_RETENTION_YEARS;
  }
  if (merged[STALE_THRESHOLD_HOURS_KEY] === undefined) {
    merged[STALE_THRESHOLD_HOURS_KEY] = DEFAULT_STALE_THRESHOLD_HOURS;
  }
  return merged;
}

/**
 * Normalizes settings for new tenants (onboarding).
 */
export function normalizeTenantSettings(settings: Record<string, unknown>): Record<string, unknown> {
  return mergeTenantSettings({}, settings);
}
