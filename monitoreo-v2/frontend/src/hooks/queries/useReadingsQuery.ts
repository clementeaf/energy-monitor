import { useQuery } from '@tanstack/react-query';
import { readingsEndpoints } from '../../services/endpoints';
import type {
  Reading, ReadingQueryParams,
  LatestQueryParams, LatestReading, AggregatedQueryParams, AggregatedReading,
} from '../../types/reading';

const KEYS = {
  timeseries: (params: ReadingQueryParams) => ['readings', params] as const,
  latest: (params?: LatestQueryParams) => ['readings', 'latest', params ?? {}] as const,
  aggregated: (params: AggregatedQueryParams) => ['readings', 'aggregated', params] as const,
};

export function useReadingsQuery(params: ReadingQueryParams, enabled = true) {
  return useQuery({
    queryKey: KEYS.timeseries(params),
    queryFn: async (): Promise<Reading[]> => {
      const { data } = await readingsEndpoints.list(params);
      return data;
    },
    enabled,
  });
}

export function useLatestReadingsQuery(params?: LatestQueryParams) {
  return useQuery({
    queryKey: KEYS.latest(params),
    queryFn: async (): Promise<LatestReading[]> => {
      const { data } = await readingsEndpoints.latest(params);
      return data;
    },
  });
}

export function useAggregatedReadingsQuery(params: AggregatedQueryParams, enabled = true) {
  return useQuery({
    queryKey: KEYS.aggregated(params),
    queryFn: async (): Promise<AggregatedReading[]> => {
      const { data } = await readingsEndpoints.aggregated(params);
      return data;
    },
    enabled,
  });
}
