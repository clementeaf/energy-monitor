import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchBilling, fetchBillingStores } from '../../services/endpoints';
import type { BillingStoreBreakdown } from '../../types';

export function useBilling(buildingName: string) {
  return useQuery({
    queryKey: ['billing', buildingName],
    queryFn: () => fetchBilling(buildingName),
    enabled: !!buildingName,
  });
}

export function useBillingStores(buildingName: string, month: string | null) {
  return useQuery({
    queryKey: ['billing-stores', buildingName, month],
    queryFn: () => fetchBillingStores(buildingName, month!),
    enabled: !!buildingName && !!month,
  });
}

/** Fetch store breakdowns for ALL months in parallel. Used for operator-level billing filtering. */
export function useBillingAllStores(buildingName: string, months: string[], enabled: boolean) {
  const queries = useQueries({
    queries: months.map((month) => ({
      queryKey: ['billing-stores', buildingName, month],
      queryFn: () => fetchBillingStores(buildingName, month),
      enabled: enabled && !!buildingName,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const allData = queries.every((q) => q.data != null)
    ? months.map((month, i) => ({ month, stores: queries[i].data as BillingStoreBreakdown[] }))
    : null;

  return { data: allData, isLoading };
}
