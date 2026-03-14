import { useQuery } from '@tanstack/react-query';
import { fetchBilling } from '../../services/endpoints';

export function useBilling(buildingName: string) {
  return useQuery({
    queryKey: ['billing', buildingName],
    queryFn: () => fetchBilling(buildingName),
    enabled: !!buildingName,
  });
}
