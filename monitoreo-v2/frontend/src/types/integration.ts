export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

export type IntegrationSyncStatus = 'success' | 'partial' | 'failed';

export interface Integration {
  id: string;
  tenantId: string;
  name: string;
  integrationType: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  lastSyncAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationSyncLog {
  id: string;
  integrationId: string;
  status: IntegrationSyncStatus;
  recordsSynced: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface IntegrationSyncLogsResult {
  items: IntegrationSyncLog[];
  total: number;
  page: number;
  limit: number;
}

export interface IntegrationQueryParams {
  integrationType?: string;
  status?: IntegrationStatus;
}

export interface IntegrationSyncLogsParams {
  page?: number;
  limit?: number;
}

export interface CreateIntegrationPayload {
  name: string;
  integrationType: string;
  status?: IntegrationStatus;
  config: Record<string, unknown>;
}

export interface UpdateIntegrationPayload {
  name?: string;
  integrationType?: string;
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
}
