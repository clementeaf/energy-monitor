import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReadingsExportService } from './readings-export.service';
import { ReadReplicaService } from '../../database/read-replica.service';
import { EtlWatermarksService } from './etl-watermarks.service';
import type { Response } from 'express';

describe('ReadingsExportService', () => {
  let service: ReadingsExportService;
  let readReplica: { query: jest.Mock };
  let watermarks: { upsertCursor: jest.Mock };
  let res: {
    setHeader: jest.Mock;
    write: jest.Mock;
    end: jest.Mock;
  };

  beforeEach(async () => {
    readReplica = { query: jest.fn().mockResolvedValue([]) };
    watermarks = { upsertCursor: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ReadingsExportService,
        { provide: ReadReplicaService, useValue: readReplica },
        { provide: EtlWatermarksService, useValue: watermarks },
      ],
    }).compile();

    service = module.get(ReadingsExportService);
    res = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
  });

  it('streams CSV header and ends when no rows', async () => {
    await service.streamCsvExport(
      't-1',
      [],
      {
        format: 'csv',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      },
      res as unknown as Response,
    );

    expect(res.write).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
    expect(readReplica.query).toHaveBeenCalled();
  });

  it('rejects invalid cursor', async () => {
    await expect(
      service.streamCsvExport(
        't-1',
        [],
        {
          format: 'csv',
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-01-02T00:00:00.000Z',
          cursor: 'bad',
        },
        res as unknown as Response,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('persists watermark when consumer id is provided', async () => {
    readReplica.query.mockResolvedValue([
      {
        id: 'r-1',
        meter_id: 'm-1',
        timestamp: '2026-01-01T12:00:00.000Z',
        power_kw: '1',
        energy_kwh_total: '2',
        quality: 'measured',
        source: 'modbus',
        voltage_l1: null,
        power_factor: null,
        frequency_hz: null,
      },
    ]);

    await service.streamCsvExport(
      't-1',
      [],
      {
        format: 'csv',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      },
      res as unknown as Response,
      'consumer-a',
    );

    expect(watermarks.upsertCursor).toHaveBeenCalledWith(
      'consumer-a',
      't-1',
      expect.any(String),
    );
  });
});
