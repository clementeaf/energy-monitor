export type WebhookDeliveryStatus = 'sent' | 'failed';

export interface WebhookDeliveryLog {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  eventType: string;
  url: string;
  status: WebhookDeliveryStatus;
  httpStatus: number | null;
  attemptCount: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface WebhookDeliveryLogQueryParams {
  status?: WebhookDeliveryStatus;
  limit?: number;
  offset?: number;
}

export interface WebhookDeliveryLogListResponse {
  data: WebhookDeliveryLog[];
  total: number;
}
