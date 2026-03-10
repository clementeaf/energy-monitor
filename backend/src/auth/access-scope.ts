export interface AccessScope {
  siteIds: string[];
  hasGlobalSiteAccess: boolean;
}

export const GLOBAL_ACCESS_SCOPE: AccessScope = {
  siteIds: [],
  hasGlobalSiteAccess: true,
};

export function getScopedSiteIds(scope: AccessScope): string[] | null {
  return scope.hasGlobalSiteAccess ? null : scope.siteIds;
}

export function hasSiteAccess(scope: AccessScope, siteId: string | null | undefined): boolean {
  if (scope.hasGlobalSiteAccess) {
    return true;
  }

  if (!siteId) {
    return false;
  }

  return scope.siteIds.includes(siteId);
}