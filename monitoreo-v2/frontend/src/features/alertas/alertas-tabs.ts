export const ALERT_TABS = ['resumen', 'gestion'] as const;
export type AlertTab = typeof ALERT_TABS[number];

export const ALERT_TAB_LABELS: Record<AlertTab, string> = {
  resumen: 'Resumen',
  gestion: 'Gestión',
};

export const ALERT_TAB_PERMS: Record<AlertTab, string[]> = {
  resumen: ['dashboard_executive:read', 'alerts:read'],
  gestion: ['alerts:update'],
};

export function getVisibleAlertTabs(hasAny: (...perms: string[]) => boolean): AlertTab[] {
  return ALERT_TABS.filter((tab) => hasAny(...ALERT_TAB_PERMS[tab]));
}
