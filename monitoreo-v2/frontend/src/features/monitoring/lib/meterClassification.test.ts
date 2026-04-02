import { describe, it, expect } from 'vitest';
import { formatMeterTypeLabel, isGenerationMeterType } from './meterClassification';

describe('isGenerationMeterType', () => {
  it('detects solar and generation keywords', () => {
    expect(isGenerationMeterType('solar')).toBe(true);
    expect(isGenerationMeterType('GENERATION')).toBe(true);
    expect(isGenerationMeterType('fotovoltaico')).toBe(true);
    expect(isGenerationMeterType('electrical')).toBe(false);
  });
});

describe('formatMeterTypeLabel', () => {
  it('maps known keys and capitalizes unknown', () => {
    expect(formatMeterTypeLabel('pv')).toBe('Fotovoltaico');
    expect(formatMeterTypeLabel('custom')).toBe('Custom');
  });
});
