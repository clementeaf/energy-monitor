import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { breachReportsEndpoints } from '../../services/endpoints';
import type { CreateBreachReportPayload, UpdateBreachReportPayload } from '../../types/breach-report';

const KEYS = {
  all: ['breach-reports'] as const,
};

/**
 * Lists breach reports (Ley 21.719, 72h timer).
 */
export function useBreachReportsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => breachReportsEndpoints.list().then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Creates a breach report and starts the 72h notification deadline.
 */
export function useCreateBreachReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBreachReportPayload) =>
      breachReportsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

/**
 * Updates breach report status (notified / resolved).
 */
export function useUpdateBreachReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBreachReportPayload }) =>
      breachReportsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
