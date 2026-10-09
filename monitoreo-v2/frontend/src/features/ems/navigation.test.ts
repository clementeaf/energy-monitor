import { describe, expect, it } from 'vitest';
import { findSectionLabel } from './navigation';

describe('findSectionLabel', () => {
  it('returns the section label for a section path and its detail pages', () => {
    expect(findSectionLabel('/margenes')).toBe('Márgenes');
    expect(findSectionLabel('/centros/abc-123')).toBe('Centros');
  });

  it('ignores paths that only share a prefix with a section', () => {
    expect(findSectionLabel('/centrosx')).toBeUndefined();
    expect(findSectionLabel('/profile')).toBeUndefined();
  });
});
