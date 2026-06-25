import { describe, it, expect } from 'vitest';
import { parsePoc3000, parseGenericFlat, parsePayload } from './parsers';

// ── Fixtures ────────────────────────────────────────────

const poc3000Payload = {
  item_id: '6ab27db7-0a61-40c2-8a93-35e9e2376683',
  item_name: 'POC3000',
  timestamp: '2026-03-24T12:15:00Z',
  count: 3,
  _embedded: {
    item: [
      { internal_name: 'V_LN/Inst/Value/L1N', value: '220.5', unit: 'V', quality: 'valid' },
      { internal_name: 'I/Inst/Value/L1', value: '15.2', unit: 'A', quality: 'valid' },
      { internal_name: 'Power/Factor/Inst/Value/AVG', value: '0.95', unit: '', quality: 'valid' },
      { internal_name: 'V_LN/Inst/Value/L2N', value: '221.0', unit: 'V', quality: 'invalid' },
      { internal_name: 'SomeOther/Variable', value: '999', unit: '', quality: 'valid' },
    ],
  },
};

const genericPayload = {
  deviceId: 'device-abc-123',
  timestamp: '2026-06-01T10:00:00Z',
  variables: {
    voltage_l1: 219.8,
    current_l1: 10.5,
    power_factor: 0.92,
    unknown_var: 42,
  },
};

// ── POC3000 parser ──────────────────────────────────────

describe('parsePoc3000', () => {
  it('extracts valid variables and maps internal names', () => {
    const result = parsePoc3000(poc3000Payload)!;
    expect(result).not.toBeNull();
    expect(result.deviceId).toBe('6ab27db7-0a61-40c2-8a93-35e9e2376683');
    expect(result.timestamp).toBe('2026-03-24T12:15:00Z');
    expect(result.variables.get('voltage_l1')).toBe(220.5);
    expect(result.variables.get('current_l1')).toBe(15.2);
    expect(result.variables.get('power_factor')).toBe(0.95);
  });

  it('skips items with quality !== valid', () => {
    const result = parsePoc3000(poc3000Payload)!;
    expect(result.variables.has('voltage_l2')).toBe(false);
  });

  it('skips unmapped internal names', () => {
    const result = parsePoc3000(poc3000Payload)!;
    // SomeOther/Variable is not in POC3000_MAP
    expect(result.variables.size).toBe(3);
  });

  it('returns null for missing _embedded', () => {
    expect(parsePoc3000({ item_id: 'x', timestamp: 'y' })).toBeNull();
  });

  it('returns null for missing item_id', () => {
    const broken = { ...poc3000Payload, item_id: undefined };
    expect(parsePoc3000(broken)).toBeNull();
  });

  it('returns null for missing timestamp', () => {
    const broken = { ...poc3000Payload, timestamp: undefined };
    expect(parsePoc3000(broken)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parsePoc3000(null)).toBeNull();
    expect(parsePoc3000('string')).toBeNull();
    expect(parsePoc3000(42)).toBeNull();
  });

  it('skips items with non-numeric values', () => {
    const payload = {
      ...poc3000Payload,
      _embedded: {
        item: [
          { internal_name: 'V_LN/Inst/Value/L1N', value: 'not-a-number', unit: 'V', quality: 'valid' },
        ],
      },
    };
    const result = parsePoc3000(payload)!;
    expect(result.variables.size).toBe(0);
  });
});

// ── Generic flat parser ─────────────────────────────────

describe('parseGenericFlat', () => {
  it('extracts variables from nested variables object', () => {
    const result = parseGenericFlat(genericPayload)!;
    expect(result).not.toBeNull();
    expect(result.deviceId).toBe('device-abc-123');
    expect(result.timestamp).toBe('2026-06-01T10:00:00Z');
    expect(result.variables.get('voltage_l1')).toBe(219.8);
    expect(result.variables.get('current_l1')).toBe(10.5);
    expect(result.variables.get('power_factor')).toBe(0.92);
  });

  it('filters out unrecognized variable names', () => {
    const result = parseGenericFlat(genericPayload)!;
    expect(result.variables.has('unknown_var')).toBe(false);
    expect(result.variables.size).toBe(3);
  });

  it('accepts meterId as device identifier', () => {
    const payload = { meterId: 'meter-1', timestamp: '2026-01-01T00:00:00Z', variables: {} };
    const result = parseGenericFlat(payload)!;
    expect(result.deviceId).toBe('meter-1');
  });

  it('accepts device_id as device identifier', () => {
    const payload = { device_id: 'dev-1', timestamp: '2026-01-01T00:00:00Z', variables: {} };
    const result = parseGenericFlat(payload)!;
    expect(result.deviceId).toBe('dev-1');
  });

  it('extracts top-level accepted variables when no variables object', () => {
    const payload = {
      deviceId: 'dev-1',
      timestamp: '2026-01-01T00:00:00Z',
      voltage_l1: 220,
      frequency_hz: 50.1,
      unrelated_field: 'hello',
    };
    const result = parseGenericFlat(payload)!;
    expect(result.variables.get('voltage_l1')).toBe(220);
    expect(result.variables.get('frequency_hz')).toBe(50.1);
    expect(result.variables.size).toBe(2);
  });

  it('returns null for missing deviceId/meterId/device_id', () => {
    expect(parseGenericFlat({ timestamp: '2026-01-01T00:00:00Z' })).toBeNull();
  });

  it('returns null for missing timestamp', () => {
    expect(parseGenericFlat({ deviceId: 'x' })).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseGenericFlat(null)).toBeNull();
    expect(parseGenericFlat([])).toBeNull();
  });
});

// ── Parser chain ────────────────────────────────────────

describe('parsePayload', () => {
  it('prefers POC3000 parser for POC3000 payloads', () => {
    const result = parsePayload(poc3000Payload)!;
    expect(result.deviceId).toBe('6ab27db7-0a61-40c2-8a93-35e9e2376683');
    expect(result.variables.get('voltage_l1')).toBe(220.5);
  });

  it('falls back to generic parser for flat payloads', () => {
    const result = parsePayload(genericPayload)!;
    expect(result.deviceId).toBe('device-abc-123');
  });

  it('returns null for unrecognized payloads', () => {
    expect(parsePayload({ random: 'data' })).toBeNull();
    expect(parsePayload(null)).toBeNull();
    expect(parsePayload(undefined)).toBeNull();
  });
});
