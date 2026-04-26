import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsEndpoints } from '../../services/endpoints';
import type { Tenant, CreateTenantPayload, UpdateTenantPayload, OnboardingResult } from '../../types/tenant';

const KEYS = {
  all: ['tenants-admin'] as const,
};

export function useTenantsAdminQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async (): Promise<Tenant[]> => {
      const { data } = await tenantsEndpoints.list();
      return data;
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenantPayload): Promise<OnboardingResult> =>
      tenantsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTenantPayload }): Promise<Tenant> =>
      tenantsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
