export const EXPORTAR_TABS = ['reportes', 'evidencia'] as const;
export type ExportarTab = typeof EXPORTAR_TABS[number];

export const EXPORTAR_TAB_LABELS: Record<ExportarTab, string> = {
  reportes: 'Reportes',
  evidencia: 'Evidencia',
};

export const EXPORTAR_TAB_PERMS: Record<ExportarTab, string[]> = {
  reportes: ['reports:read', 'reports:view_own'],
  evidencia: ['audit:read'],
};

export function getVisibleExportarTabs(hasAny: (...perms: string[]) => boolean): ExportarTab[] {
  return EXPORTAR_TABS.filter((tab) => hasAny(...EXPORTAR_TAB_PERMS[tab]));
}
