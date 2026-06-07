export interface IntegrationHealthItem {
  id: string;
  name: string;
  integrationType: string;
  status: string;
  lastSyncAt: string | null;
  syncLatencyMs: number | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}

export interface WebhookHealthSummary {
  activeSubscriptions: number;
  deliveriesLast24h: number;
  failedLast24h: number;
}

export interface IntegrationsHealthResponse {
  integrations: IntegrationHealthItem[];
  webhooks: WebhookHealthSummary;
  checkedAt: string;
}
