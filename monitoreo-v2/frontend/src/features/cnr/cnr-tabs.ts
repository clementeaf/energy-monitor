export const CNR_TABS = ['pendientes', 'ingreso'] as const;
export type CnrTab = typeof CNR_TABS[number];

export const CNR_TAB_LABELS: Record<CnrTab, string> = {
  pendientes: 'Pendientes',
  ingreso: 'Ingreso',
};

export const CNR_TAB_PERMS: Record<CnrTab, string[]> = {
  pendientes: ['data_quality:read'],
  ingreso: ['dashboard_technical:read', 'readings:read'],
};

export function getVisibleCnrTabs(hasAny: (...perms: string[]) => boolean): CnrTab[] {
  return CNR_TABS.filter((tab) => hasAny(...CNR_TAB_PERMS[tab]));
}
