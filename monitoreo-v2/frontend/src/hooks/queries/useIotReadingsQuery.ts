import { useQuery } from '@tanstack/react-query';
import {
  iotReadingsEndpoints,
  type IotLatestReading,
  type IotTimeSeriesPoint,
  type IotAlert,
  type IotStats,
} from '../../services/endpoints';

const KEYS = {
  latest: (meterId?: string) => ['iot-readings', 'latest', meterId ?? 'all'] as const,
  timeseries: (meterId: string, from: string, to: string, variables: string) =>
    ['iot-readings', 'timeseries', meterId, from, to, variables] as const,
  alerts: (meterId?: string) => ['iot-readings', 'alerts', meterId ?? 'all'] as const,
  stats: (meterId: string, from: string, to: string) =>
    ['iot-readings', 'stats', meterId, from, to] as const,
};

export function useIotLatestQuery(meterId?: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.latest(meterId),
    queryFn: async (): Promise<IotLatestReading[]> => {
      const { data } = await iotReadingsEndpoints.latest(meterId ? { meterId } : undefined);
      return data;
    },
    enabled,
    refetchInterval: 30_000,
  });
}

export function useIotTimeSeriesQuery(
  params: { meterId: string; from: string; to: string; variables: string; resolution?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: KEYS.timeseries(params.meterId, params.from, params.to, params.variables),
    queryFn: async (): Promise<IotTimeSeriesPoint[]> => {
      const { data } = await iotReadingsEndpoints.timeseries(params);
      return data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useIotAlertsQuery(meterId?: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.alerts(meterId),
    queryFn: async (): Promise<IotAlert[]> => {
      const { data } = await iotReadingsEndpoints.alerts(meterId ? { meterId } : undefined);
      return data;
    },
    enabled,
    refetchInterval: 60_000,
  });
}

export function useIotStatsQuery(
  params: { meterId: string; from: string; to: string },
  enabled = true,
) {
  return useQuery({
    queryKey: KEYS.stats(params.meterId, params.from, params.to),
    queryFn: async (): Promise<IotStats> => {
      const { data } = await iotReadingsEndpoints.stats(params);
      return data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}
