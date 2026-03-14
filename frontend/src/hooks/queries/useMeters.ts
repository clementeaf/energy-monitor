import { useQuery } from '@tanstack/react-query';
import { fetchMetersByBuilding, fetchMeterMonthly } from '../../services/endpoints';

export function useMetersByBuilding(buildingName: string) {
  return useQuery({
    queryKey: ['meters', 'building', buildingName],
    queryFn: () => fetchMetersByBuilding(buildingName),
    enabled: !!buildingName,
  });
}

export function useMeterMonthly(meterId: string) {
  return useQuery({
    queryKey: ['meter-monthly', meterId],
    queryFn: () => fetchMeterMonthly(meterId),
    enabled: !!meterId,
  });
}
