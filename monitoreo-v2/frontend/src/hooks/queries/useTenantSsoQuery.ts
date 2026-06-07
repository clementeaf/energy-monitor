import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantSsoEndpoints } from '../../services/endpoints';
import type { UpsertTenantSsoPayload } from '../../types/sso';

const KEYS = {
  config: (tenantId: string) => ['tenant-sso', tenantId] as const,
};

/**
 * Loads tenant SSO configuration for admin (secrets redacted).
 */
export function useTenantSsoConfigQuery(tenantId: string | undefined) {
  return useQuery({
    queryKey: KEYS.config(tenantId ?? ''),
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await tenantSsoEndpoints.get(tenantId);
      return data;
    },
    enabled: !!tenantId,
  });
}

/**
 * Creates or updates tenant SSO OIDC configuration.
 */
export function useUpsertTenantSsoConfig(tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertTenantSsoPayload) => {
      if (!tenantId) throw new Error('Tenant ID required');
      return tenantSsoEndpoints.upsert(tenantId, payload).then((r) => r.data);
    },
    onSuccess: () => {
      if (tenantId) {
        qc.invalidateQueries({ queryKey: KEYS.config(tenantId) });
      }
    },
  });
}
