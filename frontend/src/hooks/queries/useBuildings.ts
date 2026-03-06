import { useQuery } from '@tanstack/react-query';
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
  });
}

export function useBuildingConsumption(buildingId: string, resolution: '15min' | 'hourly' | 'daily' = 'hourly') {
  return useQuery({
    queryKey: ['buildingConsumption', buildingId, resolution],
    queryFn: () => fetchBuildingConsumption(buildingId, resolution),
  });
}
