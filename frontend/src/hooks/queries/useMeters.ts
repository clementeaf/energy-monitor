import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchMeterInfo, fetchMetersByBuilding, fetchMetersLatest, fetchMeterMonthly, fetchMeterReadings, fetchIotLatest, fetchIotMetersLatest, fetchIotMonthly, fetchIotMeterReadings } from '../../services/endpoints';
import type { MeterLatestReading } from '../../types';
import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function useMeterInfo(meterId: string) {
  const theme = useAppStore((s) => s.theme);
  const isSiemens = theme === 'siemens';
  return useQuery({
    queryKey: ['meter-info', meterId, theme],
    queryFn: async () => {
      if (isSiemens) {
        // For Siemens, build info from latest reading
        const latest = await fetchIotLatest(meterId);
        if (!latest) return null;
        return { meterId: latest.device_id, storeName: latest.device_name, buildingName: latest.device_name };
      }
      return fetchMeterInfo(meterId);
    },
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
  const theme = useAppStore((s) => s.theme);
  const isSiemens = theme === 'siemens';

  // Siemens: single call returns all devices
  const iotResult = useQuery({
    queryKey: ['iot-meters-latest'],
    queryFn: fetchIotMetersLatest,
    refetchInterval: 60_000,
    enabled: isSiemens,
  });

  // PASA: parallel calls per building
  const pasaResults = useQueries({
    queries: isSiemens ? [] : buildingNames.map((name) => ({
      queryKey: ['meters', 'latest', name],
      queryFn: () => fetchMetersLatest(name),
      refetchInterval: 60_000,
    })),
  });

  const isLoading = isSiemens ? iotResult.isLoading : pasaResults.some((r) => r.isLoading);
  const isError = isSiemens ? iotResult.isError : pasaResults.some((r) => r.isError);
  const data = useMemo<MeterLatestReading[]>(() => {
    if (isSiemens) return iotResult.data ?? [];
    return pasaResults.flatMap((r) => r.data ?? []);
  }, [isSiemens, iotResult.data, pasaResults]);

  return { data, isLoading, isError };
}

export function useMeterMonthly(meterId: string) {
  const theme = useAppStore((s) => s.theme);
  const isSiemens = theme === 'siemens';
  return useQuery({
    queryKey: ['meter-monthly', meterId, theme],
    queryFn: () => isSiemens ? fetchIotMonthly(meterId) : fetchMeterMonthly(meterId),
    enabled: !!meterId,
  });
}

export function useMeterReadings(meterId: string, from: string, to: string) {
  const theme = useAppStore((s) => s.theme);
  const isSiemens = theme === 'siemens';
  return useQuery({
    queryKey: ['meter-readings', meterId, from, to, theme],
    queryFn: () => isSiemens ? fetchIotMeterReadings(meterId, from, to) : fetchMeterReadings(meterId, from, to),
    enabled: !!meterId && !!from && !!to,
  });
}
