import { applySelectedSiteContext, getScopedSiteIds, hasSiteAccess } from '../src/auth/access-scope';

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

  it('narrows scope to the selected site when it is allowed', () => {
    const scope = { siteIds: ['pac4220', 'pac4250'], hasGlobalSiteAccess: false };

    expect(applySelectedSiteContext(scope, 'pac4250')).toEqual({
      siteIds: ['pac4250'],
      hasGlobalSiteAccess: false,
    });
  });

  it('rejects selected site outside the assigned scope', () => {
    const scope = { siteIds: ['pac4220'], hasGlobalSiteAccess: false };

    expect(applySelectedSiteContext(scope, 'pac4250')).toBeNull();
  });
});