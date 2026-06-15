import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ApiObservabilityController } from './api-observability.controller';
import type { ApiObservabilityReport } from './api-observability.controller';

describe('ApiObservabilityController (DAT-09)', () => {
  let controller: ApiObservabilityController;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [ApiObservabilityController],
      providers: [{ provide: DataSource, useValue: ds }],
    }).compile();

    controller = module.get(ApiObservabilityController);
  });

  it('returns report with periods, topEndpoints, and summary', async () => {
    // periods query
    ds.query.mockResolvedValueOnce([
      {
        period: new Date('2026-06-14T00:00:00Z'),
        total_requests: 120,
        error_count: 3,
        error_rate: 2.5,
        p50_ms: 45,
        p95_ms: 210,
        p99_ms: 480,
      },
    ]);
    // topEndpoints query
    ds.query.mockResolvedValueOnce([
      { action: 'GET /readings', count: 80, avg_ms: 55, error_count: 1 },
      { action: 'POST /users', count: 40, avg_ms: 120, error_count: 2 },
    ]);
    // summary query
    ds.query.mockResolvedValueOnce([
      { total_requests: 120, error_count: 3, error_rate: 2.5, p95_ms: 210 },
    ]);

    const result: ApiObservabilityReport = await controller.getReport(
      '2026-06-14T00:00:00Z',
      '2026-06-15T00:00:00Z',
      'day',
    );

    expect(result.granularity).toBe('day');
    expect(result.periods).toHaveLength(1);
    expect(result.periods[0].totalRequests).toBe(120);
    expect(result.periods[0].errorRate).toBe(2.5);
    expect(result.periods[0].p95Ms).toBe(210);

    expect(result.topEndpoints).toHaveLength(2);
    expect(result.topEndpoints[0].action).toBe('GET /readings');

    expect(result.summary.totalRequests).toBe(120);
    expect(result.summary.p95Ms).toBe(210);
  });

  it('defaults to 30-day range and day granularity', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total_requests: 0, error_count: 0, error_rate: 0, p95_ms: 0 }]);

    const result = await controller.getReport();

    expect(result.granularity).toBe('day');

    const fromDate = new Date(result.from);
    const toDate = new Date(result.to);
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('sanitizes invalid granularity to day', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total_requests: 0, error_count: 0, error_rate: 0, p95_ms: 0 }]);

    const result = await controller.getReport(undefined, undefined, 'bogus');

    expect(result.granularity).toBe('day');
  });

  it('passes correct interval for each granularity', async () => {
    const intervals = { hour: '1 hour', day: '1 day', week: '1 week', month: '1 month' };

    for (const [gran, expectedInterval] of Object.entries(intervals)) {
      ds.query.mockReset();
      ds.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total_requests: 0, error_count: 0, error_rate: 0, p95_ms: 0 }]);

      await controller.getReport('2026-01-01', '2026-01-02', gran);

      const periodsCall = ds.query.mock.calls[0];
      expect(periodsCall[1][0]).toBe(expectedInterval);
    }
  });

  it('handles empty summary row gracefully', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{}]);

    const result = await controller.getReport();

    expect(result.summary.totalRequests).toBe(0);
    expect(result.summary.errorRate).toBe(0);
    expect(result.summary.p95Ms).toBe(0);
  });
});
