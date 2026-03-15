import { useQuery } from '@tanstack/react-query';
import { fetchComparisonFilters, fetchComparisonByStoreType, fetchComparisonByStoreName } from '../../services/endpoints';

export function useComparisonFilters() {
  return useQuery({
    queryKey: ['comparisons', 'filters'],
    queryFn: fetchComparisonFilters,
  });
}

export function useComparisonByStoreType(storeTypeIds: number[], month: string | undefined) {
  return useQuery({
    queryKey: ['comparisons', 'by-store-type', storeTypeIds, month],
    queryFn: () => fetchComparisonByStoreType(storeTypeIds, month!),
    enabled: storeTypeIds.length > 0 && !!month,
  });
}

export function useComparisonByStoreName(storeNames: string[], month: string | undefined) {
  return useQuery({
    queryKey: ['comparisons', 'by-store-name', storeNames, month],
    queryFn: () => fetchComparisonByStoreName(storeNames, month!),
    enabled: storeNames.length > 0 && !!month,
  });
}
