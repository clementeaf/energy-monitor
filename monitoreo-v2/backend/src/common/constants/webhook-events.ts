/** Outbound webhook event types (GAP-151). */
export const WEBHOOK_EVENT_TYPES = [
  'reading.stale',
  'alert.created',
  'meter.offline',
  'gap.detected',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
