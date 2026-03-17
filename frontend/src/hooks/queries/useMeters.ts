import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchMeterInfo, fetchMetersByBuilding, fetchMetersLatest, fetchMeterMonthly, fetchMeterReadings } from '../../services/endpoints';
import type { MeterLatestReading } from '../../types';
import { useMemo } from 'react';

export function useMeterInfo(meterId: string) {
  return useQuery({
    queryKey: ['meter-info', meterId],
    queryFn: () => fetchMeterInfo(meterId),
    enabled: !!meterId,
  });
}

export function useMetersByBuilding(buildingName: string) {
  return useQuery({
    queryKey: ['meters', 'building', buildingName],
    queryFn: () => fetchMetersByBuilding(buildingName),
    enabled: !!buildingName,
  });
}

export function useMetersLatest(buildingName: string) {
  return useQuery({
    queryKey: ['meters', 'latest', buildingName],
    queryFn: () => fetchMetersLatest(buildingName),
    enabled: !!buildingName,
    refetchInterval: 60_000,
  });
}

export function useAllMetersLatest(buildingNames: string[]) {
  const results = useQueries({
    queries: buildingNames.map((name) => ({
      queryKey: ['meters', 'latest', name],
      queryFn: () => fetchMetersLatest(name),
      refetchInterval: 60_000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const data = useMemo<MeterLatestReading[]>(() => {
    return results.flatMap((r) => r.data ?? []);
  }, [results]);

  return { data, isLoading, isError };
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
