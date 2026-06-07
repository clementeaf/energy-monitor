import { Injectable } from '@nestjs/common';
import type { OidcClient, OidcTokenResponse, OidcUserProfile } from './oidc-client.interface';

const MOCK_CODE = 'mock-sso-code';
const MOCK_SUB = 'mock-oidc-sub-001';
const MOCK_EMAIL = 'sso-user@example.com';

/**
 * Mock OIDC client for local dev/tests without a real IdP.
 */
@Injectable()
export class MockOidcClient implements OidcClient {
  buildAuthorizeUrl(params: {
    issuer: string;
    clientId: string;
    redirectUri: string;
    state: string;
    scope?: string;
  }): string {
    const query = new URLSearchParams({
      code: MOCK_CODE,
      state: params.state,
    });
    return `${params.redirectUri}?${query.toString()}`;
  }

  async exchangeCode(_params: {
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
  }): Promise<OidcTokenResponse> {
    return {
      idToken: 'mock-id-token',
      accessToken: 'mock-access-token',
    };
  }

  async verifyIdToken(_params: {
    idToken: string;
    issuer: string;
    clientId: string;
    metadataUrl?: string | null;
  }): Promise<OidcUserProfile> {
    return {
      sub: MOCK_SUB,
      email: MOCK_EMAIL,
      displayName: 'SSO Mock User',
    };
  }
}

export { MOCK_CODE, MOCK_SUB, MOCK_EMAIL };
