import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { resolveBuildingTimezone, formatTimestampLocal } from './timezone';

describe('timezone helpers', () => {
  let queryMock: jest.Mock;

  beforeEach(() => {
    queryMock = jest.fn();
  });

  describe('resolveBuildingTimezone', () => {
    it('returns building timezone when set', async () => {
      queryMock.mockResolvedValue([
        { building_timezone: 'America/Santiago', tenant_timezone: 'America/Lima' },
      ]);
      const dataSource = { query: queryMock } as unknown as DataSource;

      const tz = await resolveBuildingTimezone(dataSource, 'b-1');

      expect(tz).toBe('America/Santiago');
    });

    it('falls back to tenant timezone when building timezone is null', async () => {
      queryMock.mockResolvedValue([
        { building_timezone: null, tenant_timezone: 'America/Santiago' },
      ]);
      const dataSource = { query: queryMock } as unknown as DataSource;

      const tz = await resolveBuildingTimezone(dataSource, 'b-1');

      expect(tz).toBe('America/Santiago');
    });

    it('returns UTC when building not found', async () => {
      queryMock.mockResolvedValue([]);
      const dataSource = { query: queryMock } as unknown as DataSource;

      const tz = await resolveBuildingTimezone(dataSource, 'missing');

      expect(tz).toBe('UTC');
    });
  });

  describe('formatTimestampLocal', () => {
    it('formats UTC instant in America/Santiago', () => {
      const local = formatTimestampLocal('2026-06-15T12:00:00.000Z', 'America/Santiago');
      expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      expect(local).not.toBe('2026-06-15T12:00:00');
    });
  });
});
