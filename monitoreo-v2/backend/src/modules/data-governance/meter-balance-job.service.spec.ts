import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { MeterBalanceJobService } from './meter-balance-job.service';

describe('MeterBalanceJobService', () => {
  let service: MeterBalanceJobService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn().mockResolvedValue([]) };

    const module = await Test.createTestingModule({
      providers: [MeterBalanceJobService, { provide: DataSource, useValue: ds }],
    }).compile();

    service = module.get(MeterBalanceJobService);
  });

  it('inserts anomaly when delta exceeds threshold', async () => {
    ds.query
      .mockResolvedValueOnce([
        {
          parent_meter_id: 'p-1',
          tenant_id: 't-1',
          day: '2026-06-05',
          sum_children: '90',
          parent_kwh: '100',
          delta: '10',
        },
      ])
      .mockResolvedValueOnce([{ id: 'a-1' }]);

    const count = await service.detectAnomaliesForDay('2026-06-05');
    expect(count).toBe(1);
    expect(ds.query.mock.calls[1][0]).toContain('INSERT INTO balance_anomalies');
  });

  it('skips rows within threshold', async () => {
    ds.query.mockResolvedValueOnce([
      {
        parent_meter_id: 'p-1',
        tenant_id: 't-1',
        day: '2026-06-05',
        sum_children: '99',
        parent_kwh: '100',
        delta: '1',
      },
    ]);

    const count = await service.detectAnomaliesForDay('2026-06-05');
    expect(count).toBe(0);
    expect(ds.query).toHaveBeenCalledTimes(1);
  });
});
