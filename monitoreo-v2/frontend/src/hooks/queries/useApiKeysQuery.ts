import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysEndpoints } from '../../services/endpoints';
import type {
  ApiKey, ApiKeyCreationResult,
  CreateApiKeyPayload, UpdateApiKeyPayload,
} from '../../types/api-key';

const KEYS = {
  all: ['api-keys'] as const,
};

export function useApiKeysQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async (): Promise<ApiKey[]> => {
      const { data } = await apiKeysEndpoints.list();
      return data;
    },
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateApiKeyPayload) =>
      apiKeysEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useUpdateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateApiKeyPayload }) =>
      apiKeysEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useRotateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiKeysEndpoints.rotate(id).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiKeysEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
