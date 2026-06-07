import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oauthClientsEndpoints } from '../../services/endpoints';
import type {
  CreateOAuthClientPayload,
  UpdateOAuthClientPayload,
} from '../../types/oauth-client';

const KEYS = {
  all: ['oauth-clients'] as const,
};

/**
 * Lists OAuth2 client_credentials clients for the current tenant.
 */
export function useOAuthClientsQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async () => {
      const { data } = await oauthClientsEndpoints.list();
      return data;
    },
  });
}

/**
 * Creates a new OAuth2 client (secret returned once).
 */
export function useCreateOAuthClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOAuthClientPayload) =>
      oauthClientsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

/**
 * Updates OAuth2 client scopes or status.
 */
export function useUpdateOAuthClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOAuthClientPayload }) =>
      oauthClientsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

/**
 * Rotates OAuth2 client secret (returned once).
 */
export function useRotateOAuthClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => oauthClientsEndpoints.rotate(id).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

/**
 * Deletes an OAuth2 client.
 */
export function useDeleteOAuthClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => oauthClientsEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
