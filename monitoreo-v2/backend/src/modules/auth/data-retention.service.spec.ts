import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DataRetentionService } from './data-retention.service';

describe('DataRetentionService', () => {
  let service: DataRetentionService;
  let queryMock: jest.Mock;

  beforeEach(async () => {
    queryMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        DataRetentionService,
        { provide: DataSource, useValue: { query: queryMock } },
      ],
    }).compile();

    service = module.get(DataRetentionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not delete from audit_logs or readings', async () => {
    queryMock
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([]);

    await service.run();

    const sqlCalls = queryMock.mock.calls.map((call: [string]) => call[0] as string);
    expect(sqlCalls.some((sql) => /DELETE FROM audit_logs/i.test(sql))).toBe(false);
    expect(sqlCalls.some((sql) => /DELETE FROM readings/i.test(sql))).toBe(false);
  });

  it('purges expired refresh tokens', async () => {
    queryMock
      .mockResolvedValueOnce([[], 3])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([]);

    await service.run();

    expect(queryMock.mock.calls[0][0]).toContain('DELETE FROM refresh_tokens');
  });

  it('purges old user_import_jobs when table exists', async () => {
    queryMock
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[], 2])
      .mockResolvedValueOnce([]);

    await service.run();

    const importPurgeCall = queryMock.mock.calls.find((call: [string]) =>
      call[0].includes('DELETE FROM user_import_jobs'),
    );
    expect(importPurgeCall).toBeDefined();
  });

  it('refreshes portfolio_summary', async () => {
    queryMock
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([]);

    await service.run();

    const refreshCall = queryMock.mock.calls.find((call: [string]) =>
      call[0].includes('REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary'),
    );
    expect(refreshCall).toBeDefined();
  });
});
