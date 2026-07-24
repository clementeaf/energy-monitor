import { useQuery } from '@tanstack/react-query';
import { apiObservabilityEndpoints } from '../../services/endpoints';
import type { ApiObservabilityReport } from '../../services/endpoints';

const KEYS = {
  report: (granularity: string) => ['api-observability', granularity] as const,
};

export type { ApiObservabilityReport };

/**
 * Fetches API observability report from audit_logs hypertable.
 */
export function useApiObservabilityQuery(params?: { from?: string; to?: string; granularity?: string }, options?: { enabled?: boolean }) {
  const granularity = params?.granularity ?? 'day';
  return useQuery({
    queryKey: KEYS.report(granularity),
    queryFn: () => apiObservabilityEndpoints.report(params).then((r) => r.data),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}
