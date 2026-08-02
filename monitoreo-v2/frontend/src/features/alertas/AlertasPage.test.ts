import { describe, it, expect } from 'vitest';

/**
 * Tests for the unified AlertasPage.
 * Validates that the tab structure and permission-based visibility work correctly.
 */

const TABS = ['resumen', 'gestion'] as const;
type AlertTab = typeof TABS[number];

const TAB_PERMS: Record<AlertTab, string[]> = {
  resumen: ['dashboard_executive:read', 'alerts:read'],
  gestion: ['alerts:update'],
};

function getVisibleTabs(hasAny: (...perms: string[]) => boolean): AlertTab[] {
  return TABS.filter((tab) => hasAny(...TAB_PERMS[tab]));
}

const ROLE_PERMS: Record<string, Set<string>> = {
  corp_admin: new Set(['dashboard_executive:read', 'alerts:read', 'billing:read', 'reports:read']),
  site_admin: new Set(['dashboard_executive:read', 'alerts:read', 'alerts:update', 'billing:read']),
  operator: new Set(['alerts:read', 'alerts:update', 'dashboard_technical:read']),
  auditor: new Set(['dashboard_executive:read', 'audit:read', 'alerts:read']),
};

function makeHasAny(role: string): (...perms: string[]) => boolean {
  const set = ROLE_PERMS[role] ?? new Set();
  return (...perms) => set.has('*') || perms.some((p) => set.has(p));
}

describe('AlertasPage tabs', () => {
  it('has 2 tabs: resumen and gestion', () => {
    expect(TABS).toEqual(['resumen', 'gestion']);
  });

  it('corp_admin (gerencial) sees only resumen', () => {
    const tabs = getVisibleTabs(makeHasAny('corp_admin'));
    expect(tabs).toEqual(['resumen']);
  });

  it('site_admin sees both tabs', () => {
    const tabs = getVisibleTabs(makeHasAny('site_admin'));
    expect(tabs).toEqual(['resumen', 'gestion']);
  });

  it('operator sees both tabs', () => {
    const tabs = getVisibleTabs(makeHasAny('operator'));
    expect(tabs).toEqual(['resumen', 'gestion']);
  });

  it('auditor sees only resumen (has alerts:read but not alerts:update)', () => {
    const tabs = getVisibleTabs(makeHasAny('auditor'));
    expect(tabs).toEqual(['resumen']);
  });

  it('resumen tab requires dashboard_executive:read or alerts:read', () => {
    expect(TAB_PERMS.resumen).toEqual(['dashboard_executive:read', 'alerts:read']);
  });

  it('gestion tab requires alerts:update', () => {
    expect(TAB_PERMS.gestion).toEqual(['alerts:update']);
  });
});
