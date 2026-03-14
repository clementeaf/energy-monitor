import { useQuery } from '@tanstack/react-query';
import { fetchAlerts } from '../../services/endpoints';

export function useAlerts(params?: { severity?: string; meter_id?: string }) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => fetchAlerts(params),
  });
}
