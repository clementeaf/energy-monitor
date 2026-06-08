/** Allowed OAuth2 scopes — subset of external API permissions for M2M tokens. */
export const OAUTH_SCOPES = [
  'buildings:read',
  'meters:read',
  'readings:read',
  'readings:export',
  'readings:create',
  'alerts:read',
  'billing:read',
  'tenant_units:read',
  'hierarchy:read',
  'concentrators:read',
  'fault_events:read',
  'integrations:read',
] as const;

export type OAuthScope = (typeof OAUTH_SCOPES)[number];

export const DEFAULT_OAUTH_TOKEN_TTL_SECONDS = 3600;
export const MIN_OAUTH_TOKEN_TTL_SECONDS = 300;
export const MAX_OAUTH_TOKEN_TTL_SECONDS = 86400;

/**
 * Validates that every scope string is in the allowed catalog.
 * @param scopes - OAuth scope strings
 */
export function assertValidOAuthScopes(scopes: string[]): void {
  const allowed = new Set<string>(OAUTH_SCOPES);
  for (const scope of scopes) {
    if (!allowed.has(scope)) {
      throw new Error(`Invalid OAuth scope: ${scope}`);
    }
  }
}
