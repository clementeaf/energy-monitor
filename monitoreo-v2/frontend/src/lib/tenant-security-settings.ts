import type { SsoProvider, TenantSecuritySettings } from '../types/sso';

const MIN_SESSION_MINUTES = 5;
const MAX_SESSION_MINUTES = 1440;
const DEFAULT_SSO_DEFAULT_ROLE_SLUG = 'operator';

const VALID_SSO_PROVIDERS = new Set<string>(['azure_ad', 'oidc']);

/**
 * Parses tenant security settings from the settings JSON blob.
 */
export function parseTenantSecuritySettings(
  settings: Record<string, unknown> | null | undefined,
): TenantSecuritySettings {
  const rawProvider = settings?.ssoProvider;
  let ssoProvider: SsoProvider | null = null;
  if (rawProvider === null || rawProvider === undefined) {
    ssoProvider = null;
  } else if (typeof rawProvider === 'string' && VALID_SSO_PROVIDERS.has(rawProvider)) {
    ssoProvider = rawProvider as SsoProvider;
  }

  const rawMaxSession = settings?.maxSessionMinutes;
  let maxSessionMinutes: number | null = null;
  if (
    typeof rawMaxSession === 'number'
    && Number.isInteger(rawMaxSession)
    && rawMaxSession >= MIN_SESSION_MINUTES
    && rawMaxSession <= MAX_SESSION_MINUTES
  ) {
    maxSessionMinutes = rawMaxSession;
  }

  const rawRoleSlug = settings?.ssoDefaultRoleSlug;
  const ssoDefaultRoleSlug =
    typeof rawRoleSlug === 'string' && rawRoleSlug.length > 0
      ? rawRoleSlug
      : DEFAULT_SSO_DEFAULT_ROLE_SLUG;

  return {
    ssoProvider,
    maxSessionMinutes,
    blockConcurrentSessions: settings?.blockConcurrentSessions === true,
    ssoDefaultRoleSlug,
  };
}

/**
 * Returns a human-readable label for an SSO provider.
 */
export function ssoProviderLabel(provider: SsoProvider | null): string {
  if (provider === 'azure_ad') return 'Azure AD';
  if (provider === 'oidc') return 'OIDC genérico';
  return 'Desactivado';
}
