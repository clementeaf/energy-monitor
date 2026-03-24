import { useQuery } from '@tanstack/react-query';
import { fetchAlerts, fetchIotAlerts } from '../../services/endpoints';
import { useAppStore } from '../../stores/useAppStore';

export function useAlerts(params?: { severity?: string; meter_id?: string }) {
  const theme = useAppStore((s) => s.theme);
  const isSiemens = theme === 'siemens';

  return useQuery({
    queryKey: ['alerts', theme, params],
    queryFn: () =>
      isSiemens
        ? fetchIotAlerts({ severity: params?.severity, device_id: params?.meter_id })
        : fetchAlerts(params),
  });
}
