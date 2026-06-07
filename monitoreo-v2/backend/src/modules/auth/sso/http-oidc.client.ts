import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { OidcClient, OidcTokenResponse, OidcUserProfile } from './oidc-client.interface';

/**
 * Production OIDC client using standard authorize + token + JWKS verification.
 */
@Injectable()
export class HttpOidcClient implements OidcClient {
  buildAuthorizeUrl(params: {
    issuer: string;
    clientId: string;
    redirectUri: string;
    state: string;
    scope?: string;
  }): string {
    const base = params.issuer.replace(/\/$/, '');
    const authorizePath = base.includes('login.microsoftonline.com')
      ? `${base}/oauth2/v2.0/authorize`
      : `${base}/authorize`;
    const scope = params.scope ?? 'openid profile email';
    const query = new URLSearchParams({
      client_id: params.clientId,
      response_type: 'code',
      redirect_uri: params.redirectUri,
      scope,
      state: params.state,
    });
    return `${authorizePath}?${query.toString()}`;
  }

  async exchangeCode(params: {
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
  }): Promise<OidcTokenResponse> {
    const base = params.issuer.replace(/\/$/, '');
    const tokenPath = base.includes('login.microsoftonline.com')
      ? `${base}/oauth2/v2.0/token`
      : `${base}/token`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
    });
    const res = await fetch(tokenPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new UnauthorizedException('OIDC token exchange failed');
    }
    const json = (await res.json()) as { id_token?: string; access_token?: string };
    if (!json.id_token) {
      throw new UnauthorizedException('OIDC token response missing id_token');
    }
    return {
      idToken: json.id_token,
      accessToken: json.access_token ?? '',
    };
  }

  async verifyIdToken(params: {
    idToken: string;
    issuer: string;
    clientId: string;
    metadataUrl?: string | null;
  }): Promise<OidcUserProfile> {
    const jwksUri = await this.resolveJwksUri(params.issuer, params.metadataUrl);
    const jwks = createRemoteJWKSet(new URL(jwksUri));
    const normalizedIssuer = params.issuer.replace(/\/$/, '');
    const { payload } = await jwtVerify(params.idToken, jwks, {
      issuer: [normalizedIssuer, `${normalizedIssuer}/`],
      audience: params.clientId,
    }).catch(() => {
      throw new UnauthorizedException('Invalid OIDC id_token');
    });
    const email = (payload.email ?? payload.preferred_username) as string | undefined;
    if (!email || !payload.sub) {
      throw new UnauthorizedException('OIDC id_token missing required claims');
    }
    return {
      sub: payload.sub,
      email,
      displayName: (payload.name as string | undefined) ?? email,
    };
  }

  private async resolveJwksUri(issuer: string, metadataUrl?: string | null): Promise<string> {
    if (metadataUrl) {
      const res = await fetch(metadataUrl);
      if (res.ok) {
        const doc = (await res.json()) as { jwks_uri?: string };
        if (doc.jwks_uri) return doc.jwks_uri;
      }
    }
    const base = issuer.replace(/\/$/, '');
    if (base.includes('login.microsoftonline.com')) {
      return `${base}/discovery/v2.0/keys`;
    }
    return `${base}/.well-known/jwks.json`;
  }
}
