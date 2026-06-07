import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  MeterReadingStatusService,
  computeLagSeconds,
} from './meter-reading-status.service';
import { MeterReadingStatus } from '../platform/entities/meter-reading-status.entity';

describe('MeterReadingStatusService', () => {
  let service: MeterReadingStatusService;
  let queryMock: jest.Mock;

  beforeEach(async () => {
    queryMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        MeterReadingStatusService,
        { provide: getRepositoryToken(MeterReadingStatus), useValue: {} },
        { provide: DataSource, useValue: { query: queryMock } },
      ],
    }).compile();

    service = module.get(MeterReadingStatusService);
  });

  describe('getStaleMeters', () => {
    it('queries meters exceeding threshold hours', async () => {
      queryMock.mockResolvedValue([{ meter_id: 'm-1' }]);

      const result = await service.getStaleMeters('t-1', 4);

      expect(result).toHaveLength(1);
      expect(queryMock.mock.calls[0][1]).toEqual(['t-1', '4']);
    });
  });

  describe('getStatusForMeter', () => {
    it('returns status with lag and stale flag', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      queryMock.mockResolvedValue([
        {
          meter_id: 'm-1',
          last_reading_at: twoHoursAgo,
          last_ingested_at: twoHoursAgo,
          last_source: 'modbus',
        },
      ]);

      const result = await service.getStatusForMeter('m-1', 't-1', [], {});

      expect(result?.meterId).toBe('m-1');
      expect(result?.lastSource).toBe('modbus');
      expect(result?.isStale).toBe(false);
      expect(result?.staleThresholdHours).toBe(4);
      expect(result?.lagSeconds).toBeGreaterThan(7000);
    });

    it('returns null when meter not in scope', async () => {
      queryMock.mockResolvedValue([]);
      const result = await service.getStatusForMeter('missing', 't-1', ['b-1'], {});
      expect(result).toBeNull();
    });
  });
});

describe('computeLagSeconds', () => {
  it('returns null for missing timestamp', () => {
    expect(computeLagSeconds(null)).toBeNull();
  });

  it('returns non-negative seconds', () => {
    const lag = computeLagSeconds(new Date(Date.now() - 5000).toISOString());
    expect(lag).toBeGreaterThanOrEqual(4);
  });
});
