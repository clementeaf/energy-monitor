import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { regionsEndpoints } from '../../services/endpoints';
import type { CreateRegionPayload, UpdateRegionPayload } from '../../types/region';

const KEYS = {
  all: ['regions'] as const,
};

/**
 * Lists geographic regions for the current tenant.
 */
export function useRegionsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => regionsEndpoints.list().then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Creates a region.
 */
export function useCreateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRegionPayload) =>
      regionsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

/**
 * Updates a region.
 */
export function useUpdateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRegionPayload }) =>
      regionsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

/**
 * Deletes a region.
 */
export function useDeleteRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => regionsEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
