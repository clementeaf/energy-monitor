import { useQuery } from '@tanstack/react-query';
import { readingsEndpoints } from '../../services/endpoints';
import type {
  Reading, ReadingQueryParams,
  LatestQueryParams, LatestReading, LatestReadingAnchor,
  AggregatedQueryParams, AggregatedReading, CompareBuildingsResponse,
} from '../../types/reading';

const KEYS = {
  timeseries: (params: ReadingQueryParams) => ['readings', params] as const,
  latest: (params?: LatestQueryParams) => ['readings', 'latest', params ?? {}] as const,
  latestAnchor: () => ['readings', 'latest-anchor'] as const,
  compareBuildings: (days: number) => ['readings', 'compare-buildings', days] as const,
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

export function useLatestReadingAnchorQuery(enabled = true) {
  return useQuery({
    queryKey: KEYS.latestAnchor(),
    queryFn: async (): Promise<LatestReadingAnchor> => {
      const { data } = await readingsEndpoints.latestAnchor();
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Bundled compare dashboard data (anchor + current + previous building aggregates).
 * @param days - Range window: 1, 7, or 30
 * @param enabled - Whether the query runs
 */
export function useCompareBuildingsQuery(days: number, enabled = true) {
  return useQuery({
    queryKey: KEYS.compareBuildings(days),
    queryFn: async (): Promise<CompareBuildingsResponse> => {
      const { data } = await readingsEndpoints.compareBuildings({ days });
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
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
    staleTime: 5 * 60 * 1000, // 5 min — aggregated data doesn't change fast
  });
}
