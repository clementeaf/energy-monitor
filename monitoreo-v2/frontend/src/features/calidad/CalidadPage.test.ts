import { describe, it, expect } from 'vitest';
import { getVisibleCalidadTabs } from './calidad-tabs';

const ROLE_PERMS: Record<string, Set<string>> = {
  site_admin: new Set(['data_quality:read', 'dashboard_executive:read', 'alerts:read']),
  operator: new Set(['dashboard_technical:read', 'alerts:read']),
  auditor: new Set(['audit:read', 'dashboard_executive:read']),
  corp_admin: new Set(['dashboard_executive:read', 'billing:read']),
};

function makeHasAny(role: string): (...perms: string[]) => boolean {
  const set = ROLE_PERMS[role] ?? new Set();
  return (...perms) => perms.some((p) => set.has(p));
}

describe('CalidadPage tabs', () => {
  it('site_admin sees both tabs (has data_quality:read)', () => {
    const tabs = getVisibleCalidadTabs(makeHasAny('site_admin'));
    expect(tabs).toEqual(['scorecard', 'backfill']);
  });

  it('auditor sees only scorecard (has audit:read, no data_quality:read)', () => {
    const tabs = getVisibleCalidadTabs(makeHasAny('auditor'));
    expect(tabs).toEqual(['scorecard']);
  });

  it('operator sees nothing (no audit:read nor data_quality:read)', () => {
    const tabs = getVisibleCalidadTabs(makeHasAny('operator'));
    expect(tabs).toEqual([]);
  });

  it('corp_admin sees nothing (no quality perms)', () => {
    const tabs = getVisibleCalidadTabs(makeHasAny('corp_admin'));
    expect(tabs).toEqual([]);
  });
});
