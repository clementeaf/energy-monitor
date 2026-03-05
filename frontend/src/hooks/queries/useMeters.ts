import { useQuery } from '@tanstack/react-query';
import { fetchMetersByBuilding, fetchMeter, fetchMeterReadings } from '../../services/endpoints';

export function useMetersByBuilding(buildingId: string) {
  return useQuery({
    queryKey: ['meters', buildingId],
    queryFn: () => fetchMetersByBuilding(buildingId),
  });
}

export function useMeter(meterId: string) {
  return useQuery({
    queryKey: ['meter', meterId],
    queryFn: () => fetchMeter(meterId),
  });
}

export function useMeterReadings(meterId: string, resolution: 'raw' | 'hourly' | 'daily' = 'hourly') {
  return useQuery({
    queryKey: ['readings', meterId, resolution],
    queryFn: () => fetchMeterReadings(meterId, resolution),
  });
}
