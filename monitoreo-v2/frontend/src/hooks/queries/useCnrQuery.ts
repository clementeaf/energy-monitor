import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnrEndpoints } from '../../services/endpoints';
import type { CnrRecord, CreateCnrPayload, UpdateCnrStatusPayload } from '../../types/cnr';

const KEYS = { all: ['cnr'] as const };

export function useCnrQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async (): Promise<CnrRecord[]> => {
      const { data } = await cnrEndpoints.list();
      return data;
    },
  });
}

export function useCreateCnr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCnrPayload) => cnrEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useUpdateCnrStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCnrStatusPayload }) =>
      cnrEndpoints.updateStatus(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
