import { describe, it, expect } from 'vitest';
import { contrastForeground, darkenHex, deriveBrandTokens, lightenHex } from './color-utils';

describe('darkenHex', () => {
  it('darkens a valid hex color', () => {
    expect(darkenHex('#ffffff', 0.5)).toBe('#808080');
  });

  it('returns input when hex is invalid', () => {
    expect(darkenHex('not-a-color', 0.5)).toBe('not-a-color');
  });
});

describe('lightenHex', () => {
  it('lightens a valid hex color', () => {
    expect(lightenHex('#000000', 0.5)).toBe('#808080');
  });
});

describe('contrastForeground', () => {
  it('returns white on dark backgrounds', () => {
    expect(contrastForeground('#1c1c1c')).toBe('#ffffff');
  });

  it('returns dark text on light backgrounds', () => {
    expect(contrastForeground('#fafafa')).toBe('#0a0a0a');
  });
});

describe('deriveBrandTokens', () => {
  it('derives brand tokens from primary hex', () => {
    const tokens = deriveBrandTokens('#3a5b1e');
    expect(tokens['--color-brand']).toBe('#3a5b1e');
    expect(tokens['--color-brand-hover']).toBe('#33501a');
    expect(tokens['--color-brand-fg']).toBe('#ffffff');
    expect(tokens['--color-chart-1']).toBe('#3a5b1e');
    expect(tokens['--color-brand-muted']).toContain('color-mix');
  });
});
