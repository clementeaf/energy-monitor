import { useQuery } from '@tanstack/react-query';
import { fetchComparisonFilters, fetchComparisonByStore, fetchComparisonGroupedByType, fetchComparisonByStoreType, fetchComparisonByStoreName } from '../../services/endpoints';

export function useComparisonFilters(buildingNames?: string[]) {
  return useQuery({
    queryKey: ['comparisons', 'filters', buildingNames],
    queryFn: () => fetchComparisonFilters(buildingNames),
  });
}

export function useComparisonByStore(month: string | undefined, buildingNames?: string[], storeTypeIds?: number[], storeNames?: string[]) {
  return useQuery({
    queryKey: ['comparisons', 'by-store', month, buildingNames, storeTypeIds, storeNames],
    queryFn: () => fetchComparisonByStore(month!, buildingNames, storeTypeIds, storeNames),
    enabled: !!month,
  });
}

export function useComparisonGroupedByType(month: string | undefined, buildingNames?: string[]) {
  return useQuery({
    queryKey: ['comparisons', 'grouped-by-type', month, buildingNames],
    queryFn: () => fetchComparisonGroupedByType(month!, buildingNames),
    enabled: !!month,
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
