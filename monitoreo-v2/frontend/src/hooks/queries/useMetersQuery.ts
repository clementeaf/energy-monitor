import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metersEndpoints } from '../../services/endpoints';
import type { Meter, CreateMeterPayload, UpdateMeterPayload } from '../../types/meter';

const KEYS = {
  all: (buildingId?: string) => buildingId ? ['meters', { buildingId }] as const : ['meters'] as const,
  detail: (id: string) => ['meters', id] as const,
};

export function useMetersQuery(buildingId?: string) {
  return useQuery({
    queryKey: KEYS.all(buildingId),
    queryFn: async (): Promise<Meter[]> => {
      const { data } = await metersEndpoints.list(buildingId);
      return data;
    },
  });
}

export function useMeterQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async (): Promise<Meter> => {
      const { data } = await metersEndpoints.get(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMeter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMeterPayload) =>
      metersEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['meters'] }); },
  });
}

export function useUpdateMeter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMeterPayload }) =>
      metersEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['meters'] }); },
  });
}

export function useDeleteMeter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => metersEndpoints.remove(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['meters'] }); },
  });
}
