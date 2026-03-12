import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchBuildings, fetchBuilding, fetchBuildingConsumption } from '../../services/endpoints';

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: fetchBuildings,
  });
}

export function useBuilding(id: string) {
  return useQuery({
    queryKey: ['building', id],
    queryFn: () => fetchBuilding(id),
    enabled: !!id,
  });
}

export function useBuildingConsumption(
  buildingId: string,
  resolution: '15min' | 'hourly' | 'daily' = 'hourly',
  from?: string,
  to?: string,
) {
  return useQuery({
    queryKey: ['buildingConsumption', buildingId, resolution, from, to],
    queryFn: () => fetchBuildingConsumption(buildingId, resolution, from, to),
    enabled: !!buildingId && !!from && !!to,
    placeholderData: keepPreviousData,
  });
}
