import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interventionsEndpoints } from '../../services/endpoints';
import type { InterventionRecord, CreateInterventionPayload } from '../../types/intervention';

const KEYS = { all: ['interventions'] as const };

export function useInterventionsQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async (): Promise<InterventionRecord[]> => {
      const { data } = await interventionsEndpoints.list();
      return data;
    },
  });
}

export function useCreateIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInterventionPayload) => interventionsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
