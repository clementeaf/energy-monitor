import { useQuery } from '@tanstack/react-query';
import { webhookDeliveryLogsEndpoints } from '../../services/endpoints';
import type { WebhookDeliveryLogQueryParams } from '../../types/webhook-delivery-log';

const KEYS = {
  all: (params?: WebhookDeliveryLogQueryParams) => ['webhook-delivery-logs', params ?? {}] as const,
};

/**
 * Lists webhook delivery attempt logs.
 */
export function useWebhookDeliveryLogsQuery(
  params?: WebhookDeliveryLogQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: KEYS.all(params),
    queryFn: async () => {
      const { data } = await webhookDeliveryLogsEndpoints.list(params);
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}
