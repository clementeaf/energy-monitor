import { useQuery } from '@tanstack/react-query';
import { faultEventsEndpoints } from '../../services/endpoints';
import type { FaultEvent, FaultEventQueryParams } from '../../types/fault-event';

const KEYS = {
  list: (params?: FaultEventQueryParams) => ['fault-events', params ?? {}] as const,
  one: (id: string) => ['fault-events', id] as const,
};

export function useFaultEventsQuery(params?: FaultEventQueryParams, enabled = true) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async (): Promise<FaultEvent[]> => {
      const { data } = await faultEventsEndpoints.list(params);
      return data;
    },
    enabled,
  });
}

export function useFaultEventQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async (): Promise<FaultEvent> => {
      const { data } = await faultEventsEndpoints.get(id);
      return data;
    },
    enabled: enabled && !!id,
  });
}
