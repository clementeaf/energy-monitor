import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchIotLatest, fetchIotTimeSeries, fetchIotReadings, fetchIotStats } from '../../services/endpoints';

export const useIotLatest = (deviceId: string) =>
  useQuery({
    queryKey: ['iot-latest', deviceId],
    queryFn: () => fetchIotLatest(deviceId),
    refetchInterval: 60_000,
  });

export const useIotTimeSeries = (
  deviceId: string,
  from: string,
  to: string,
  columns: string,
  resolution = 'raw',
  enabled = true,
) =>
  useQuery({
    queryKey: ['iot-timeseries', deviceId, from, to, columns, resolution],
    queryFn: () => fetchIotTimeSeries(deviceId, from, to, columns, resolution),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useIotReadings = (
  deviceId: string,
  from: string,
  to: string,
  limit = 100,
  offset = 0,
) =>
  useQuery({
    queryKey: ['iot-readings', deviceId, from, to, limit, offset],
    queryFn: () => fetchIotReadings(deviceId, from, to, limit, offset),
    placeholderData: keepPreviousData,
  });

export const useIotStats = (deviceId: string, from: string, to: string) =>
  useQuery({
    queryKey: ['iot-stats', deviceId, from, to],
    queryFn: () => fetchIotStats(deviceId, from, to),
  });
