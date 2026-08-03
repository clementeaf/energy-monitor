import api from '../api';
import { API_ROUTES } from '../routes';
import type { AuthProvider, MeResponse } from '../../types/auth';
import type {
  SsoPublicConfig,
  SsoStartResult,
  TenantSsoAdminConfig,
  UpsertTenantSsoPayload,
} from '../../types/sso';

export interface MfaSetupResponse {
  secret: string;
  qrDataUrl: string;
  otpauthUrl: string;
}

export const authEndpoints = {
  clearSessionCookies: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.clearSession),

  login: (provider: AuthProvider, idToken: string) =>
    api.post<{
      success?: boolean;
      mfaRequired?: boolean;
      mfaSetupRequired?: boolean;
      userId?: string;
      secret?: string;
      qrDataUrl?: string;
      otpauthUrl?: string;
      accessToken?: string;
    }>(API_ROUTES.auth.login, { provider, idToken }),

  me: () =>
    api.get<MeResponse>(API_ROUTES.auth.me),

  logout: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.logout),

  refresh: () =>
    api.post<{ success: boolean; accessToken?: string }>(API_ROUTES.auth.refresh),

  mfaSetup: (forceRegenerate = false) =>
    api.post<MfaSetupResponse>(API_ROUTES.auth.mfaSetup, { forceRegenerate }),

  mfaVerify: (code: string) =>
    api.post<{ success: boolean; mfaEnabled: boolean; recoveryCodes?: string[] }>(API_ROUTES.auth.mfaVerify, { code }),

  mfaVerifySetup: (userId: string, code: string) =>
    api.post<
      { success: boolean; mfaEnabled: boolean; recoveryCodes?: string[]; accessToken?: string } & Partial<MeResponse>
    >(API_ROUTES.auth.mfaVerifySetup, { userId, code }),

  mfaValidate: (userId: string, code: string) =>
    api.post<{ success: boolean; accessToken?: string } & Partial<MeResponse>>(
      API_ROUTES.auth.mfaValidate,
      { userId, code },
    ),

  mfaStatus: () =>
    api.get<{ mfaEnabled: boolean }>(API_ROUTES.auth.mfaStatus),

  mfaDisable: () =>
    api.delete<{ success: boolean; mfaEnabled: boolean }>(API_ROUTES.auth.mfaDisable),

  webauthnRegisterOptions: () =>
    api.post(API_ROUTES.auth.webauthnRegisterOptions),

  webauthnRegisterVerify: (response: unknown, deviceName?: string) =>
    api.post(API_ROUTES.auth.webauthnRegisterVerify, { response, deviceName }),

  webauthnLoginOptions: (email: string) =>
    api.post<{ userId: string }>(API_ROUTES.auth.webauthnLoginOptions, { email }),

  webauthnLoginVerify: (userId: string, response: unknown) =>
    api.post<{ success: boolean }>(API_ROUTES.auth.webauthnLoginVerify, { userId, response }),

  webauthnCredentials: () =>
    api.get<{ id: string; credential_id: string; device_name: string | null; created_at: string }[]>(API_ROUTES.auth.webauthnCredentials),

  webauthnDeleteCredential: (credentialId: string) =>
    api.delete(API_ROUTES.auth.webauthnCredentials, { data: { credentialId } }),

  acceptPrivacy: () =>
    api.post<{ success: boolean; version: string }>(API_ROUTES.auth.acceptPrivacy),

  meExport: () =>
    api.get<Record<string, unknown>>(API_ROUTES.auth.meExport),

  meDeletionRequest: (reason?: string) =>
    api.post<{ requestId: string; requestedAt: string } | { alreadyRequested: boolean; requestId: string }>(
      API_ROUTES.auth.meDeletionRequest, { reason }),

  updateMe: (data: { displayName?: string }) =>
    api.patch<{ success: boolean }>(API_ROUTES.auth.updateMe, data),

  oppose: (reason?: string) =>
    api.post<{ success: boolean }>(API_ROUTES.auth.oppose, { reason }),

  block: (reason?: string) =>
    api.post<{ success: boolean }>(API_ROUTES.auth.block, { reason }),

  revokePrivacy: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.revokePrivacy),

  rectificationRequest: (fieldName: string, requestedValue: string, reason?: string) =>
    api.post<{ requestId: string; responseDeadline: string }>(
      API_ROUTES.auth.rectificationRequest, { fieldName, requestedValue, reason }),

  automatedDecisions: (optOut: boolean) =>
    api.post<{ success: boolean }>(API_ROUTES.auth.automatedDecisions, { optOut }),
};

export const ssoEndpoints = {
  getPublicConfig: (tenantSlug: string) =>
    api.get<SsoPublicConfig>(API_ROUTES.auth.ssoConfig(tenantSlug)),

  startLogin: (tenantSlug: string) =>
    api.get<SsoStartResult>(API_ROUTES.auth.ssoStart(tenantSlug)),
};

export const tenantSsoEndpoints = {
  get: (tenantId: string) => api.get<TenantSsoAdminConfig | null>(API_ROUTES.tenantSso(tenantId)),
  upsert: (tenantId: string, payload: UpsertTenantSsoPayload) =>
    api.put<TenantSsoAdminConfig>(API_ROUTES.tenantSso(tenantId), payload),
};
