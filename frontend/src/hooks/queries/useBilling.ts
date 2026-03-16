import { useQuery } from '@tanstack/react-query';
import { fetchBilling, fetchBillingStores } from '../../services/endpoints';

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
