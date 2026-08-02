export const CALIDAD_TABS = ['scorecard', 'backfill'] as const;
export type CalidadTab = typeof CALIDAD_TABS[number];

export const CALIDAD_TAB_LABELS: Record<CalidadTab, string> = {
  scorecard: 'Scorecard',
  backfill: 'Backfill',
};

export const CALIDAD_TAB_PERMS: Record<CalidadTab, string[]> = {
  scorecard: ['audit:read', 'data_quality:read'],
  backfill: ['data_quality:read'],
};

export function getVisibleCalidadTabs(hasAny: (...perms: string[]) => boolean): CalidadTab[] {
  return CALIDAD_TABS.filter((tab) => hasAny(...CALIDAD_TAB_PERMS[tab]));
}
