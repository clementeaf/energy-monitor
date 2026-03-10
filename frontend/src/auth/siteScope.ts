export function hasGlobalSiteAccess(siteIds: string[]): boolean {
  return siteIds.includes('*');
}

export function isSiteInScope(siteIds: string[], siteId: string | null | undefined): boolean {
  if (!siteId) return false;
  return hasGlobalSiteAccess(siteIds) || siteIds.includes(siteId);
}

export function matchesSelectedSite(selectedSiteId: string | null, siteId: string | null | undefined): boolean {
  if (!selectedSiteId || selectedSiteId === '*') return true;
  return siteId === selectedSiteId;
}