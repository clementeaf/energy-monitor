import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backfillJobsEndpoints } from '../../services/endpoints';
import type { CreateBackfillJobPayload } from '../../types/backfill-job';

const KEYS = {
  all: ['backfill-jobs'] as const,
};

/**
 * Lists backfill jobs for the current tenant.
 */
export function useBackfillJobsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => backfillJobsEndpoints.list().then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Enqueues a new backfill job.
 */
export function useCreateBackfillJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBackfillJobPayload) =>
      backfillJobsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

/**
 * Runs the backfill worker for a pending job.
 */
export function useProcessBackfillJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backfillJobsEndpoints.process(id).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
