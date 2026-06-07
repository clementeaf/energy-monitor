export const WEBHOOK_EVENT_TYPES = [
  'reading.stale',
  'alert.created',
  'meter.offline',
  'gap.detected',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  eventType: WebhookEventType;
  url: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookSubscriptionPayload {
  eventType: WebhookEventType;
  url: string;
  secret: string;
  active?: boolean;
}

export interface UpdateWebhookSubscriptionPayload {
  eventType?: WebhookEventType;
  url?: string;
  secret?: string;
  active?: boolean;
}

export interface WebhookSubscriptionQueryParams {
  eventType?: string;
  active?: 'true' | 'false';
}
