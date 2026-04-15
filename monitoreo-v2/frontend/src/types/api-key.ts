export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  buildingIds: string[];
  rateLimitPerMinute: number;
  expiresAt: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyCreationResult {
  key: string;
  apiKey: ApiKey;
}

export interface CreateApiKeyPayload {
  name: string;
  permissions: string[];
  buildingIds?: string[];
  rateLimitPerMinute?: number;
  expiresAt?: string;
}

export interface UpdateApiKeyPayload {
  name?: string;
  permissions?: string[];
  buildingIds?: string[];
  rateLimitPerMinute?: number;
  expiresAt?: string | null;
  isActive?: boolean;
}
