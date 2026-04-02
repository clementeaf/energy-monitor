import { useQuery } from '@tanstack/react-query';
import { concentratorsEndpoints } from '../../services/endpoints';
import type { Concentrator } from '../../types/concentrator';
import type { Meter } from '../../types/meter';

const KEYS = {
  list: (buildingId?: string) => ['concentrators', { buildingId }] as const,
  one: (id: string) => ['concentrators', id] as const,
  meters: (id: string) => ['concentrators', id, 'meters'] as const,
};

export function useConcentratorsQuery(buildingId?: string) {
  return useQuery({
    queryKey: KEYS.list(buildingId),
    queryFn: async (): Promise<Concentrator[]> => {
      const { data } = await concentratorsEndpoints.list(buildingId);
      return data;
    },
  });
}

export function useConcentratorQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async (): Promise<Concentrator> => {
      const { data } = await concentratorsEndpoints.get(id);
      return data;
    },
    enabled: enabled && !!id,
  });
}

export function useConcentratorMetersQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.meters(id),
    queryFn: async (): Promise<Meter[]> => {
      const { data } = await concentratorsEndpoints.meters(id);
      return data;
    },
    enabled: enabled && !!id,
  });
}
