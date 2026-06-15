import {
  DEFAULT_RETENTION_YEARS,
  DEFAULT_IDLE_TIMEOUT_MINUTES,
  getRetentionYears,
  getIdleTimeoutMinutes,
  getSsoProvider,
  getDataMinimization,
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

  describe('getIdleTimeoutMinutes', () => {
    it('defaults to 15', () => {
      expect(getIdleTimeoutMinutes({})).toBe(DEFAULT_IDLE_TIMEOUT_MINUTES);
      expect(getIdleTimeoutMinutes(undefined)).toBe(15);
      expect(getIdleTimeoutMinutes(null)).toBe(15);
    });

    it('reads valid value from settings', () => {
      expect(getIdleTimeoutMinutes({ idleTimeoutMinutes: 30 })).toBe(30);
      expect(getIdleTimeoutMinutes({ idleTimeoutMinutes: 5 })).toBe(5);
      expect(getIdleTimeoutMinutes({ idleTimeoutMinutes: 60 })).toBe(60);
    });

    it('falls back to default for out-of-range values', () => {
      expect(getIdleTimeoutMinutes({ idleTimeoutMinutes: 4 })).toBe(15);
      expect(getIdleTimeoutMinutes({ idleTimeoutMinutes: 61 })).toBe(15);
      expect(getIdleTimeoutMinutes({ idleTimeoutMinutes: 0 })).toBe(15);
      expect(getIdleTimeoutMinutes({ idleTimeoutMinutes: -1 })).toBe(15);
    });

    it('falls back to default for non-integer values', () => {
      expect(getIdleTimeoutMinutes({ idleTimeoutMinutes: 15.5 })).toBe(15);
      expect(getIdleTimeoutMinutes({ idleTimeoutMinutes: 'fifteen' })).toBe(15);
    });
  });

  it('mergeTenantSettings validates idleTimeoutMinutes', () => {
    expect(() => mergeTenantSettings({}, { idleTimeoutMinutes: 0 })).toThrow();
    expect(() => mergeTenantSettings({}, { idleTimeoutMinutes: 4 })).toThrow();
    expect(() => mergeTenantSettings({}, { idleTimeoutMinutes: 61 })).toThrow();
    expect(mergeTenantSettings({}, { idleTimeoutMinutes: 15 }).idleTimeoutMinutes).toBe(15);
  });

  describe('PRI-05: dataMinimization', () => {
    it('returns empty object when not set', () => {
      expect(getDataMinimization({})).toEqual({});
      expect(getDataMinimization(undefined)).toEqual({});
      expect(getDataMinimization(null)).toEqual({});
    });

    it('parses valid config', () => {
      const settings = {
        dataMinimization: {
          phone: 'excluded',
          email: 'required',
          fullName: 'optional',
        },
      };
      const result = getDataMinimization(settings);
      expect(result.phone).toBe('excluded');
      expect(result.email).toBe('required');
      expect(result.fullName).toBe('optional');
    });

    it('skips invalid visibility values', () => {
      const settings = {
        dataMinimization: {
          phone: 'excluded',
          email: 'bogus',
        },
      };
      const result = getDataMinimization(settings);
      expect(result.phone).toBe('excluded');
      expect(result.email).toBeUndefined();
    });

    it('validates in merge — rejects invalid type', () => {
      expect(() => mergeTenantSettings({}, { dataMinimization: 'not-object' })).toThrow();
      expect(() => mergeTenantSettings({}, { dataMinimization: [1, 2] })).toThrow();
    });

    it('validates in merge — rejects invalid field visibility', () => {
      expect(() =>
        mergeTenantSettings({}, { dataMinimization: { phone: 'nope' } }),
      ).toThrow('settings.dataMinimization.phone');
    });

    it('accepts valid config in merge', () => {
      const result = mergeTenantSettings({}, {
        dataMinimization: { phone: 'excluded', email: 'required' },
      });
      expect((result.dataMinimization as Record<string, string>).phone).toBe('excluded');
    });

    it('accepts null (reset to default)', () => {
      const result = mergeTenantSettings(
        { dataMinimization: { phone: 'excluded' } },
        { dataMinimization: null },
      );
      expect(result.dataMinimization).toBeNull();
    });
  });
});
