import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { registerMappingsEndpoints } from '../../services/endpoints';
import type {
  CreateRegisterMappingPayload,
  RegisterMappingQueryParams,
  UpdateRegisterMappingPayload,
} from '../../types/register-mapping';

const KEYS = {
  all: (params?: RegisterMappingQueryParams) => ['register-mappings', params ?? {}] as const,
  protocolTypes: ['register-mappings', 'protocol-types'] as const,
};

/**
 * Lists register mappings with optional protocol filter.
 */
export function useRegisterMappingsQuery(
  params?: RegisterMappingQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: KEYS.all(params),
    queryFn: () => registerMappingsEndpoints.list(params).then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Loads supported protocol types catalog.
 */
export function useProtocolTypesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.protocolTypes,
    queryFn: () => registerMappingsEndpoints.protocolTypes().then((r) => r.data),
    enabled: options?.enabled ?? true,
    staleTime: 300_000,
  });
}

/**
 * Creates a register mapping row.
 */
export function useCreateRegisterMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRegisterMappingPayload) =>
      registerMappingsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['register-mappings'] }); },
  });
}

/**
 * Updates an existing register mapping.
 */
export function useUpdateRegisterMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRegisterMappingPayload }) =>
      registerMappingsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['register-mappings'] }); },
  });
}

/**
 * Deletes a register mapping.
 */
export function useDeleteRegisterMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => registerMappingsEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['register-mappings'] }); },
  });
}

/**
 * Triggers CSV export download for register mappings.
 */
export async function downloadRegisterMappingsCsv(params?: RegisterMappingQueryParams): Promise<void> {
  const { data } = await registerMappingsEndpoints.exportCsv(params);
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'register-mappings.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}
