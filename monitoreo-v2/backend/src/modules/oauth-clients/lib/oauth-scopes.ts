/** Allowed OAuth2 scopes for client_credentials tokens (maps to permission strings). */
export const OAUTH_SCOPES = [
  'buildings:read',
  'meters:read',
  'readings:read',
  'readings:export',
  'alerts:read',
] as const;

export type OAuthScope = (typeof OAUTH_SCOPES)[number];

export const DEFAULT_OAUTH_TOKEN_TTL_SECONDS = 3600;
export const MIN_OAUTH_TOKEN_TTL_SECONDS = 300;
export const MAX_OAUTH_TOKEN_TTL_SECONDS = 86400;

/**
 * Validates that every scope string is in the allowed catalog.
 */
export function assertValidOAuthScopes(scopes: string[]): void {
  const allowed = new Set<string>(OAUTH_SCOPES);
  for (const scope of scopes) {
    if (!allowed.has(scope)) {
      throw new Error(`Invalid OAuth scope: ${scope}`);
    }
  }
}
