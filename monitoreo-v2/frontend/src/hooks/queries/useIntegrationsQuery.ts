import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationsEndpoints } from '../../services/endpoints';
import type {
  IntegrationQueryParams,
  IntegrationSyncLogsParams,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
} from '../../types/integration';

const INTEGRATIONS_KEY = ['integrations'] as const;

/**
 * Lists tenant integrations with optional type and status filters.
 * @param params - Optional query filters
 * @param options - Query options (e.g. enabled when RBAC allows read)
 */
export function useIntegrationsQuery(
  params?: IntegrationQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...INTEGRATIONS_KEY, params ?? {}],
    queryFn: () => integrationsEndpoints.list(params).then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Paginated sync history for one integration.
 * @param integrationId - Integration UUID
 * @param params - Page and limit
 * @param options - Query options
 */
export function useIntegrationSyncLogsQuery(
  integrationId: string | null,
  params?: IntegrationSyncLogsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...INTEGRATIONS_KEY, integrationId, 'sync-logs', params ?? {}],
    queryFn: () =>
      integrationsEndpoints.syncLogs(integrationId!, params).then((r) => r.data),
    enabled: (options?.enabled ?? true) && integrationId != null && integrationId.length > 0,
  });
}

/**
 * Creates a new integration row.
 */
export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateIntegrationPayload) =>
      integrationsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INTEGRATIONS_KEY });
    },
  });
}

/**
 * Updates an existing integration.
 */
export function useUpdateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateIntegrationPayload }) =>
      integrationsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INTEGRATIONS_KEY });
    },
  });
}

/**
 * Deletes an integration.
 */
export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsEndpoints.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INTEGRATIONS_KEY });
    },
  });
}

/**
 * Triggers a stub sync run and refreshes integration timestamps.
 */
export function useTriggerIntegrationSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsEndpoints.sync(id).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: INTEGRATIONS_KEY });
      qc.invalidateQueries({ queryKey: [...INTEGRATIONS_KEY, id, 'sync-logs'] });
    },
  });
}
