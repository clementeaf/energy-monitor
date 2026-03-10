import { getScopedSiteIds, hasSiteAccess } from '../src/auth/access-scope';

describe('access-scope helpers', () => {
  it('treats global scope as unrestricted', () => {
    const scope = { siteIds: [], hasGlobalSiteAccess: true };

    expect(getScopedSiteIds(scope)).toBeNull();
    expect(hasSiteAccess(scope, 'pac4220')).toBe(true);
  });

  it('restricts scoped access to assigned siteIds', () => {
    const scope = { siteIds: ['pac4220'], hasGlobalSiteAccess: false };

    expect(getScopedSiteIds(scope)).toEqual(['pac4220']);
    expect(hasSiteAccess(scope, 'pac4220')).toBe(true);
    expect(hasSiteAccess(scope, 'pac4250')).toBe(false);
    expect(hasSiteAccess(scope, null)).toBe(false);
  });
});