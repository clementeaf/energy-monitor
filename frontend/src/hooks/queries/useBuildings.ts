import { useQuery } from '@tanstack/react-query';
import { fetchBuildings, fetchBuilding } from '../../services/endpoints';

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: fetchBuildings,
  });
}

export function useBuilding(name: string) {
  return useQuery({
    queryKey: ['building', name],
    queryFn: () => fetchBuilding(name),
    enabled: !!name,
  });
}
