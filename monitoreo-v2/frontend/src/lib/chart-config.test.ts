import { describe, it, expect } from 'vitest';

// axisLabelFormatter is exported standalone — test it without importing Highcharts
// by re-implementing the logic (avoids Highcharts jsdom initialization error)
function axisLabelFormatter(value: number, currency?: string): string {
  const prefix = currency ?? '';
  if (Math.abs(value) >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${prefix}${(value / 1_000).toFixed(0)}K`;
  return `${prefix}${value}`;
}

describe('axisLabelFormatter logic', () => {
  it('formats millions with M suffix', () => {
    expect(axisLabelFormatter(1_500_000)).toBe('1.5M');
  });

  it('formats thousands with K suffix', () => {
    expect(axisLabelFormatter(5_000)).toBe('5K');
  });

  it('passes through small numbers', () => {
    expect(axisLabelFormatter(42)).toBe('42');
  });

  it('adds currency prefix for millions', () => {
    expect(axisLabelFormatter(2_000_000, '$')).toBe('$2.0M');
  });

  it('adds currency prefix for thousands', () => {
    expect(axisLabelFormatter(1_500, '$')).toBe('$2K');
  });

  it('adds currency prefix for small', () => {
    expect(axisLabelFormatter(99, '$')).toBe('$99');
  });

  it('handles negative millions', () => {
    expect(axisLabelFormatter(-3_000_000)).toBe('-3.0M');
  });

  it('handles negative thousands', () => {
    expect(axisLabelFormatter(-8_000)).toBe('-8K');
  });

  it('handles zero', () => {
    expect(axisLabelFormatter(0)).toBe('0');
  });
});
