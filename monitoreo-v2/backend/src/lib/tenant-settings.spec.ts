import {
  DEFAULT_RETENTION_YEARS,
  getRetentionYears,
  getSsoProvider,
  mergeTenantSettings,
  normalizeTenantSettings,
  resolveSessionMinutes,
} from './tenant-settings';

describe('tenant-settings', () => {
  it('defaults retentionYears to 5', () => {
    expect(getRetentionYears({})).toBe(DEFAULT_RETENTION_YEARS);
    expect(getRetentionYears(undefined)).toBe(5);
  });

  it('reads valid retentionYears from settings', () => {
    expect(getRetentionYears({ retentionYears: 7 })).toBe(7);
  });

  it('mergeTenantSettings applies default when missing', () => {
    expect(mergeTenantSettings({}, {})).toEqual({
      retentionYears: 5,
      staleThresholdHours: 4,
    });
  });

  it('mergeTenantSettings rejects invalid retentionYears', () => {
    expect(() => mergeTenantSettings({}, { retentionYears: 0 })).toThrow();
    expect(() => mergeTenantSettings({}, { retentionYears: 11 })).toThrow();
  });

  it('normalizeTenantSettings for onboarding', () => {
    expect(normalizeTenantSettings({ locale: 'es-CL' })).toEqual({
      locale: 'es-CL',
      retentionYears: 5,
      staleThresholdHours: 4,
    });
  });

  it('getSsoProvider returns null when disabled', () => {
    expect(getSsoProvider({})).toBeNull();
    expect(getSsoProvider({ ssoProvider: 'azure_ad' })).toBe('azure_ad');
  });

  it('mergeTenantSettings validates ssoProvider', () => {
    expect(() => mergeTenantSettings({}, { ssoProvider: 'invalid' })).toThrow();
    expect(mergeTenantSettings({}, { ssoProvider: null })).toEqual({
      retentionYears: 5,
      staleThresholdHours: 4,
      ssoProvider: null,
    });
  });

  it('resolveSessionMinutes prefers tenant override', () => {
    expect(resolveSessionMinutes({ maxSessionMinutes: 15 }, 1440)).toBe(15);
    expect(resolveSessionMinutes({}, 30)).toBe(30);
  });
});
