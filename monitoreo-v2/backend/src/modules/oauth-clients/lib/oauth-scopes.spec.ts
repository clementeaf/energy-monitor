import { assertValidOAuthScopes, OAUTH_SCOPES } from './oauth-scopes';

describe('oauth-scopes', () => {
  it('accepts known scopes', () => {
    expect(() => assertValidOAuthScopes([...OAUTH_SCOPES])).not.toThrow();
  });

  it('rejects unknown scope', () => {
    expect(() => assertValidOAuthScopes(['readings:export', 'invalid:scope'])).toThrow(
      'Invalid OAuth scope',
    );
  });
});
