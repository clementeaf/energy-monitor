import { useQuery } from '@tanstack/react-query';
import { integrationsEndpoints } from '../../services/endpoints';

const KEYS = {
  health: ['integrations', 'health'] as const,
};

/**
 * Fetches integration sync latency and webhook delivery health snapshot.
 */
export function useIntegrationsHealthQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.health,
    queryFn: () => integrationsEndpoints.health().then((r) => r.data),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}
