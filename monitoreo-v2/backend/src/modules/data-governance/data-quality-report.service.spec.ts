import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataQualityReportService } from './data-quality-report.service';
import { DataQualityDaily } from '../platform/entities/data-quality-daily.entity';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const USER: JwtPayload = {
  sub: 'u-1',
  email: 'admin@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'corp_admin',
  permissions: ['data_quality:read'],
  buildingIds: [],
};

describe('DataQualityReportService', () => {
  let service: DataQualityReportService;

  beforeEach(async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          tenantId: 't-1',
          buildingId: 'b-1',
          day: '2026-06-05',
          measuredPct: '95.00',
          estimatedPct: '3.00',
          invalidPct: '1.00',
          unknownPct: '1.00',
          total: '1000',
        },
      ]),
    };

    const module = await Test.createTestingModule({
      providers: [
        DataQualityReportService,
        {
          provide: getRepositoryToken(DataQualityDaily),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
      ],
    }).compile();

    service = module.get(DataQualityReportService);
  });

  it('returns report with summary for tenant', async () => {
    const report = await service.getReport(USER, undefined, '2026-06-01', '2026-06-06');
    expect(report.tenantId).toBe('t-1');
    expect(report.rows).toHaveLength(1);
    expect(report.summary.totalReadings).toBe(1000);
  });
});
