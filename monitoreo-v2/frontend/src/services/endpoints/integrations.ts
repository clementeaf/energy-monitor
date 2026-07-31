import api from '../api';
import { API_ROUTES } from '../routes';
import type {
  Integration,
  IntegrationQueryParams,
  IntegrationSyncLog,
  IntegrationSyncLogsResult,
  IntegrationSyncLogsParams,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
} from '../../types/integration';
import type { IntegrationsHealthResponse } from '../../types/integrations-health';
import type {
  WebhookSubscription,
  CreateWebhookSubscriptionPayload,
  UpdateWebhookSubscriptionPayload,
  WebhookSubscriptionQueryParams,
} from '../../types/webhook';
import type {
  WebhookDeliveryLogListResponse,
  WebhookDeliveryLogQueryParams,
} from '../../types/webhook-delivery-log';

export const integrationsEndpoints = {
  list: (params?: IntegrationQueryParams) =>
    api.get<Integration[]>(API_ROUTES.integrations, { params }),

  get: (id: string) =>
    api.get<Integration>(`${API_ROUTES.integrations}/${id}`),

  create: (payload: CreateIntegrationPayload) =>
    api.post<Integration>(API_ROUTES.integrations, payload),

  update: (id: string, payload: UpdateIntegrationPayload) =>
    api.patch<Integration>(`${API_ROUTES.integrations}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.integrations}/${id}`),

  sync: (id: string) =>
    api.post<IntegrationSyncLog>(`${API_ROUTES.integrations}/${id}/sync`, {}),

  syncLogs: (id: string, params?: IntegrationSyncLogsParams) =>
    api.get<IntegrationSyncLogsResult>(`${API_ROUTES.integrations}/${id}/sync-logs`, { params }),

  health: () =>
    api.get<IntegrationsHealthResponse>(API_ROUTES.integrationsHealth),
};

export const integrationTypesEndpoints = {
  list: () => api.get<{ type: string; label: string }[]>(API_ROUTES.supportedTypes),
};

export const webhookSubscriptionsEndpoints = {
  list: (params?: WebhookSubscriptionQueryParams) =>
    api.get<WebhookSubscription[]>(API_ROUTES.webhookSubscriptions, { params }),
  create: (payload: CreateWebhookSubscriptionPayload) =>
    api.post<WebhookSubscription>(API_ROUTES.webhookSubscriptions, payload),
  update: (id: string, payload: UpdateWebhookSubscriptionPayload) =>
    api.patch<WebhookSubscription>(`${API_ROUTES.webhookSubscriptions}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.webhookSubscriptions}/${id}`),
};

export const webhookDeliveryLogsEndpoints = {
  list: (params?: WebhookDeliveryLogQueryParams) =>
    api.get<WebhookDeliveryLogListResponse>(API_ROUTES.webhookDeliveryLogs, { params }),
};
