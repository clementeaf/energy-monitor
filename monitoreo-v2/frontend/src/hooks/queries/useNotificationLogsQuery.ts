import { useQuery } from '@tanstack/react-query';
import { notificationLogsEndpoints } from '../../services/endpoints';
import type { NotificationLogQueryParams, NotificationLogResult } from '../../types/notification-log';

export function useNotificationLogsQuery(params?: NotificationLogQueryParams) {
  return useQuery({
    queryKey: ['notification-logs', params],
    queryFn: async (): Promise<NotificationLogResult> => {
      const { data } = await notificationLogsEndpoints.list(params);
      return data;
    },
  });
}
