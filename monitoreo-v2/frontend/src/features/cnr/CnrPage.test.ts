import { describe, it, expect } from 'vitest';
import { getVisibleCnrTabs } from './cnr-tabs';

const ROLE_PERMS: Record<string, Set<string>> = {
  site_admin: new Set(['data_quality:read', 'dashboard_technical:read', 'readings:read']),
  operator: new Set(['dashboard_technical:read', 'readings:read', 'alerts:read']),
  auditor: new Set(['audit:read', 'dashboard_executive:read']),
};

function makeHasAny(role: string): (...perms: string[]) => boolean {
  const set = ROLE_PERMS[role] ?? new Set();
  return (...perms) => perms.some((p) => set.has(p));
}

describe('CnrPage tabs', () => {
  it('site_admin sees both tabs', () => {
    expect(getVisibleCnrTabs(makeHasAny('site_admin'))).toEqual(['pendientes', 'ingreso']);
  });

  it('operator sees only ingreso (has technical perms, no data_quality:read)', () => {
    expect(getVisibleCnrTabs(makeHasAny('operator'))).toEqual(['ingreso']);
  });

  it('auditor sees nothing (no cnr perms)', () => {
    expect(getVisibleCnrTabs(makeHasAny('auditor'))).toEqual([]);
  });
});
