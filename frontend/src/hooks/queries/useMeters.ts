import { useQuery } from '@tanstack/react-query';
import { fetchMetersByBuilding, fetchMeterMonthly, fetchMeterReadings } from '../../services/endpoints';

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

export function useMeterReadings(meterId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['meter-readings', meterId, from, to],
    queryFn: () => fetchMeterReadings(meterId, from, to),
    enabled: !!meterId && !!from && !!to,
  });
}
