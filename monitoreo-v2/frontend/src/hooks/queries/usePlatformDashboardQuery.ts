import { useQuery } from '@tanstack/react-query';
import { platformDashboardEndpoints } from '../../services/endpoints';
import { useAuthStore } from '../../store/useAuthStore';
import type { PlatformKpis } from '../../types/platform-dashboard';

export function usePlatformKpisQuery(extraEnabled = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['platform-dashboard', 'kpis'],
    queryFn: async (): Promise<PlatformKpis> => {
      const { data } = await platformDashboardEndpoints.kpis();
      return data;
    },
    enabled: isAuthenticated && extraEnabled,
  });
}
