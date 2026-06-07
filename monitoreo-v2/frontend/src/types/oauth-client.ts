export const OAUTH_SCOPES = [
  'buildings:read',
  'meters:read',
  'readings:read',
  'readings:export',
  'alerts:read',
] as const;

export type OAuthScope = (typeof OAUTH_SCOPES)[number];

export interface OAuthClient {
  id: string;
  tenantId: string;
  name: string;
  clientId: string;
  clientIdPrefix: string;
  scopes: string[];
  buildingIds: string[];
  tokenTtlSeconds: number;
  isActive: boolean;
  lastUsedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthClientCreationResult {
  clientId: string;
  clientSecret: string;
  client: OAuthClient;
}

export interface CreateOAuthClientPayload {
  name: string;
  scopes: string[];
  buildingIds?: string[];
  tokenTtlSeconds?: number;
}

export interface UpdateOAuthClientPayload {
  name?: string;
  scopes?: string[];
  buildingIds?: string[];
  tokenTtlSeconds?: number;
  isActive?: boolean;
}
