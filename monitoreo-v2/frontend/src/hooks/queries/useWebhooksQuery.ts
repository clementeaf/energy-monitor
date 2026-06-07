import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { webhookSubscriptionsEndpoints } from '../../services/endpoints';
import type {
  CreateWebhookSubscriptionPayload,
  UpdateWebhookSubscriptionPayload,
  WebhookSubscriptionQueryParams,
} from '../../types/webhook';

const KEYS = {
  all: (params?: WebhookSubscriptionQueryParams) => ['webhook-subscriptions', params ?? {}] as const,
};

/**
 * Lists outbound webhook subscriptions for the current tenant.
 */
export function useWebhookSubscriptionsQuery(
  params?: WebhookSubscriptionQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: KEYS.all(params),
    queryFn: () => webhookSubscriptionsEndpoints.list(params).then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Creates a webhook subscription with HMAC signing secret.
 */
export function useCreateWebhookSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWebhookSubscriptionPayload) =>
      webhookSubscriptionsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhook-subscriptions'] }); },
  });
}

/**
 * Updates webhook subscription URL, secret, or active flag.
 */
export function useUpdateWebhookSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWebhookSubscriptionPayload }) =>
      webhookSubscriptionsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhook-subscriptions'] }); },
  });
}

/**
 * Deletes a webhook subscription.
 */
export function useDeleteWebhookSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => webhookSubscriptionsEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhook-subscriptions'] }); },
  });
}
