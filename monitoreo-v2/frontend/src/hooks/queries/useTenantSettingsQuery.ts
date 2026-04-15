import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantSettingsEndpoints } from '../../services/endpoints';
import type { Tenant, UpdateTenantPayload } from '../../types/tenant';

const KEYS = {
  me: ['tenant', 'me'] as const,
};

export function useMyTenantQuery() {
  return useQuery({
    queryKey: KEYS.me,
    queryFn: async (): Promise<Tenant> => {
      const { data } = await tenantSettingsEndpoints.getMyTenant();
      return data;
    },
  });
}

export function useUpdateMyTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTenantPayload) =>
      tenantSettingsEndpoints.updateMyTenant(payload).then((r) => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS.me }); },
  });
}
