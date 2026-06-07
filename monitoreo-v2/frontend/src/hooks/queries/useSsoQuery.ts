import { useQuery } from '@tanstack/react-query';
import { ssoEndpoints } from '../../services/endpoints';

const KEYS = {
  publicConfig: (slug: string) => ['sso', 'public', slug] as const,
};

/**
 * Fetches public SSO config for a tenant login page (unauthenticated).
 */
export function useSsoPublicConfigQuery(tenantSlug: string | null) {
  return useQuery({
    queryKey: KEYS.publicConfig(tenantSlug ?? ''),
    queryFn: async () => {
      if (!tenantSlug) return null;
      const { data } = await ssoEndpoints.getPublicConfig(tenantSlug);
      return data;
    },
    enabled: !!tenantSlug && tenantSlug.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * Starts SSO login by fetching the OIDC redirect URL.
 */
export async function startSsoLogin(tenantSlug: string): Promise<string> {
  const { data } = await ssoEndpoints.startLogin(tenantSlug);
  return data.redirectUrl;
}
