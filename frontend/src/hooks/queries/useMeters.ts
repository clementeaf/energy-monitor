import { useQuery } from '@tanstack/react-query';
import { fetchMetersByBuilding } from '../../services/endpoints';

export function useMetersByBuilding(buildingName: string) {
  return useQuery({
    queryKey: ['meters', 'building', buildingName],
    queryFn: () => fetchMetersByBuilding(buildingName),
    enabled: !!buildingName,
  });
}
