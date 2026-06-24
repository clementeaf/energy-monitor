import { describe, it, expect } from 'vitest';
import {
  getStatusStyle,
  severityToStatus,
  deriveBuildingStatus,
  type EnergyStatus,
} from './energy-status';
import type { AlertSeverity } from '../types/alert';

const ALL_STATUSES: EnergyStatus[] = ['normal', 'warning', 'critical', 'nodata'];
const ALL_SEVERITIES: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

describe('energy-status', () => {
  describe('getStatusStyle', () => {
    it.each(ALL_STATUSES)('returns style object for "%s"', (status) => {
      const style = getStatusStyle(status);
      expect(style.bg).toBeTruthy();
      expect(style.text).toBeTruthy();
      expect(style.marker).toMatch(/^#[0-9a-f]{6}$/);
      expect(style.label).toBeTruthy();
    });
  });

  describe('severityToStatus', () => {
    it.each([
      ['critical', 'critical'],
      ['high', 'critical'],
      ['medium', 'warning'],
      ['low', 'warning'],
    ] as const)('maps severity "%s" to status "%s"', (severity, expected) => {
      expect(severityToStatus(severity)).toBe(expected);
    });
  });

  describe('deriveBuildingStatus', () => {
    it('returns "normal" for no alerts with data', () => {
      expect(deriveBuildingStatus([], true)).toBe('normal');
    });

    it('returns "nodata" for no alerts and no data', () => {
      expect(deriveBuildingStatus([], false)).toBe('nodata');
    });

    it('returns "critical" when critical alert present', () => {
      expect(deriveBuildingStatus(['critical'], true)).toBe('critical');
    });

    it('returns "critical" when high alert present', () => {
      expect(deriveBuildingStatus(['high'], true)).toBe('critical');
    });

    it('returns "warning" when only medium alerts', () => {
      expect(deriveBuildingStatus(['medium'], true)).toBe('warning');
    });

    it('returns "warning" when only low alerts', () => {
      expect(deriveBuildingStatus(['low'], true)).toBe('warning');
    });

    it('returns "critical" when mixed severities (critical wins)', () => {
      expect(deriveBuildingStatus(['low', 'critical', 'medium'], true)).toBe('critical');
    });

    it('returns "warning" when mixed warning-level severities', () => {
      expect(deriveBuildingStatus(['low', 'medium'], true)).toBe('warning');
    });
  });
});
