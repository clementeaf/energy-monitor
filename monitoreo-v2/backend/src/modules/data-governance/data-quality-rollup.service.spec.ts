import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DataQualityRollupService } from './data-quality-rollup.service';

describe('DataQualityRollupService', () => {
  let service: DataQualityRollupService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn().mockResolvedValue([{ count: '3' }]) };

    const module = await Test.createTestingModule({
      providers: [DataQualityRollupService, { provide: DataSource, useValue: ds }],
    }).compile();

    service = module.get(DataQualityRollupService);
  });

  it('upserts data_quality_daily for a day', async () => {
    const count = await service.rollupDay('2026-06-05');
    expect(count).toBe(3);
    expect(ds.query.mock.calls[0][0]).toContain('data_quality_daily');
  });
});
