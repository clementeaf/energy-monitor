import { useQuery } from '@tanstack/react-query';
import { fetchLocalsByBuilding, fetchLocal, fetchConsumption } from '../../services/endpoints';

export function useLocalsByBuilding(buildingId: string) {
  return useQuery({
    queryKey: ['locals', buildingId],
    queryFn: () => fetchLocalsByBuilding(buildingId),
  });
}

export function useLocal(localId: string) {
  return useQuery({
    queryKey: ['local', localId],
    queryFn: () => fetchLocal(localId),
  });
}

export function useLocalConsumption(localId: string) {
  return useQuery({
    queryKey: ['consumption', localId],
    queryFn: () => fetchConsumption(localId),
  });
}
