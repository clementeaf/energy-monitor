import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildingsEndpoints } from '../../services/endpoints';
import type { Building, CreateBuildingPayload, UpdateBuildingPayload } from '../../types/building';

const KEYS = {
  all: ['buildings'] as const,
  detail: (id: string) => ['buildings', id] as const,
};

export function useBuildingsQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async (): Promise<Building[]> => {
      const { data } = await buildingsEndpoints.list();
      return data;
    },
  });
}

export function useBuildingQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async (): Promise<Building> => {
      const { data } = await buildingsEndpoints.get(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBuildingPayload) =>
      buildingsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useUpdateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBuildingPayload }) =>
      buildingsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useDeleteBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => buildingsEndpoints.remove(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
