export interface OidcTokenResponse {
  idToken: string;
  accessToken: string;
}

export interface OidcUserProfile {
  sub: string;
  email: string;
  displayName: string;
}

/**
 * Abstraction for OIDC authorize URL + code exchange (real or mock IdP).
 */
export interface OidcClient {
  buildAuthorizeUrl(params: {
    issuer: string;
    clientId: string;
    redirectUri: string;
    state: string;
    scope?: string;
  }): string;

  exchangeCode(params: {
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
  }): Promise<OidcTokenResponse>;

  verifyIdToken(params: {
    idToken: string;
    issuer: string;
    clientId: string;
    metadataUrl?: string | null;
  }): Promise<OidcUserProfile>;
}

export const OIDC_CLIENT = Symbol('OIDC_CLIENT');
