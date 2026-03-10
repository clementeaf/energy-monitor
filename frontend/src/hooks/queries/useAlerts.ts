import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { acknowledgeAlert, fetchAlert, fetchAlerts, syncOfflineAlerts } from '../../services/endpoints';
import type { Alert, AlertsSyncSummary, AlertStatus } from '../../types';

export interface AlertsFilters {
  status?: AlertStatus;
  type?: string;
  meterId?: string;
  buildingId?: string;
  limit?: number;
}

export function useAlerts(
  filters: AlertsFilters = {},
  options: Partial<UseQueryOptions<Alert[]>> = {},
) {
  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => fetchAlerts(filters),
    staleTime: 30_000,
    refetchInterval: 60_000,
    ...options,
  });
}

export function useAlert(alertId: string) {
  return useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => fetchAlert(alertId),
    enabled: !!alertId,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => acknowledgeAlert(alertId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useSyncOfflineAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (): Promise<AlertsSyncSummary> => syncOfflineAlerts(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
