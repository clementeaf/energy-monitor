import { useQuery } from '@tanstack/react-query';
import { platformDashboardEndpoints } from '../../services/endpoints';
import type { PlatformKpis } from '../../types/platform-dashboard';

export function usePlatformKpisQuery(enabled = true) {
  return useQuery({
    queryKey: ['platform-dashboard', 'kpis'],
    queryFn: async (): Promise<PlatformKpis> => {
      const { data } = await platformDashboardEndpoints.kpis();
      return data;
    },
    enabled,
  });
}
