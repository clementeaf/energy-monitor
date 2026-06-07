import { ApiErrorCode, API_ERROR_CATALOG, getApiErrorDefinition } from './api-error-codes';

describe('api-error-codes', () => {
  it('catalog has unique codes', () => {
    const codes = API_ERROR_CATALOG.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('getApiErrorDefinition returns entry', () => {
    const def = getApiErrorDefinition(ApiErrorCode.OAUTH_CLIENT_INVALID);
    expect(def?.httpStatus).toBe(401);
    expect(def?.module).toBe('oauth-clients');
  });
});
