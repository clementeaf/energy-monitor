export type SsoProvider = 'azure_ad' | 'oidc';

export interface SsoPublicConfig {
  ssoRequired: boolean;
  provider: SsoProvider | null;
  tenantSlug: string;
}

export interface SsoStartResult {
  redirectUrl: string;
}

export interface TenantSsoAdminConfig {
  tenantId: string;
  issuer: string;
  clientId: string;
  metadataUrl: string | null;
  hasClientSecret: boolean;
  hasScimWebhookSecret: boolean;
  updatedAt: string;
}

export interface UpsertTenantSsoPayload {
  issuer: string;
  clientId: string;
  clientSecret: string;
  metadataUrl?: string | null;
  scimWebhookSecret?: string | null;
}

export interface TenantSecuritySettings {
  ssoProvider: SsoProvider | null;
  maxSessionMinutes: number | null;
  blockConcurrentSessions: boolean;
  ssoDefaultRoleSlug: string;
}
