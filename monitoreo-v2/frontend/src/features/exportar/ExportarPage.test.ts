import { describe, it, expect } from 'vitest';
import { getVisibleExportarTabs } from './exportar-tabs';

const ROLE_PERMS: Record<string, Set<string>> = {
  corp_admin: new Set(['reports:read', 'reports:view_own', 'dashboard_executive:read']),
  auditor: new Set(['audit:read', 'reports:read', 'dashboard_executive:read']),
  operator: new Set(['alerts:read', 'dashboard_technical:read']),
};

function makeHasAny(role: string): (...perms: string[]) => boolean {
  const set = ROLE_PERMS[role] ?? new Set();
  return (...perms) => perms.some((p) => set.has(p));
}

describe('ExportarPage tabs', () => {
  it('corp_admin sees only reportes', () => {
    expect(getVisibleExportarTabs(makeHasAny('corp_admin'))).toEqual(['reportes']);
  });

  it('auditor sees both tabs', () => {
    expect(getVisibleExportarTabs(makeHasAny('auditor'))).toEqual(['reportes', 'evidencia']);
  });

  it('operator sees nothing', () => {
    expect(getVisibleExportarTabs(makeHasAny('operator'))).toEqual([]);
  });
});
