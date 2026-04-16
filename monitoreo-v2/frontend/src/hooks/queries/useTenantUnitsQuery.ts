import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantUnitsEndpoints } from '../../services/endpoints';
import type {
  TenantUnit, CreateTenantUnitPayload, UpdateTenantUnitPayload, TenantUnitMeter,
} from '../../types/tenant-unit';

const KEYS = {
  all: ['tenantUnits'] as const,
  detail: (id: string) => ['tenantUnits', id] as const,
  meters: (id: string) => ['tenantUnits', id, 'meters'] as const,
};

export function useTenantUnitsQuery(buildingId?: string) {
  return useQuery({
    queryKey: [...KEYS.all, buildingId ?? 'all'],
    queryFn: async (): Promise<TenantUnit[]> => {
      const { data } = await tenantUnitsEndpoints.list(buildingId);
      return data;
    },
  });
}

export function useTenantUnitMetersQuery(id: string) {
  return useQuery({
    queryKey: KEYS.meters(id),
    queryFn: async (): Promise<TenantUnitMeter[]> => {
      const { data } = await tenantUnitsEndpoints.meters(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTenantUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenantUnitPayload) =>
      tenantUnitsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useUpdateTenantUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTenantUnitPayload }) =>
      tenantUnitsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useDeleteTenantUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantUnitsEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useAddTenantUnitMeter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, meterId }: { id: string; meterId: string }) =>
      tenantUnitsEndpoints.addMeter(id, meterId).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.meters(id) });
    },
  });
}

export function useRemoveTenantUnitMeter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, meterId }: { id: string; meterId: string }) =>
      tenantUnitsEndpoints.removeMeter(id, meterId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.meters(id) });
    },
  });
}
