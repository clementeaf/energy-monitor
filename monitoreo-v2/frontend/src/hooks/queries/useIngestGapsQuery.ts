import { useQuery } from '@tanstack/react-query';
import { ingestGapsEndpoints } from '../../services/endpoints';
import type { IngestGapListParams } from '../../types/ingest-gap';

const KEYS = {
  all: (params?: IngestGapListParams) => ['ingest-gaps', params ?? {}] as const,
};

/**
 * Lists ingest gaps for monitoring/admin views.
 */
export function useIngestGapsQuery(
  params?: IngestGapListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: KEYS.all(params),
    queryFn: async () => {
      const { data } = await ingestGapsEndpoints.list(params);
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}
