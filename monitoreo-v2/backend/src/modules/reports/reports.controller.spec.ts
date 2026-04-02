import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'analyst',
  permissions: ['reports:read', 'reports:create', 'reports:update'],
  buildingIds: [],
};

const report = {
  id: 'rep-1',
  tenantId: 't-1',
  buildingId: 'b-1',
  reportType: 'consumption',
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
  format: 'pdf',
  fileUrl: null,
  fileSizeBytes: null,
  generatedBy: 'u-1',
  createdAt: new Date(),
};

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      generate: jest.fn(),
      exportReport: jest.fn(),
      findAllScheduled: jest.fn(),
      createScheduled: jest.fn(),
      updateScheduled: jest.fn(),
      removeScheduled: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: service }],
    }).compile();

    controller = module.get(ReportsController);
  });

  it('findAll delegates to service', async () => {
    service.findAll.mockResolvedValue([report]);
    const result = await controller.findAll(user, {});
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], {});
    expect(result).toEqual([report]);
  });

  it('generate delegates to service', async () => {
    const dto = {
      reportType: 'consumption' as const,
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      format: 'pdf' as const,
    };
    service.generate.mockResolvedValue(report);
    const result = await controller.generate(dto, user);
    expect(service.generate).toHaveBeenCalledWith('t-1', 'u-1', dto, []);
    expect(result).toEqual(report);
  });

  it('findOne throws when missing', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('x', user)).rejects.toThrow(NotFoundException);
  });

  it('export sends buffer', async () => {
    const buf = Buffer.from('x');
    service.exportReport.mockResolvedValue({
      buffer: buf,
      mime: 'application/pdf',
      filename: 'r.pdf',
    });
    const res = {
      set: jest.fn(),
      send: jest.fn(),
    };
    await controller.export('rep-1', user, res as never);
    expect(res.set).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(buf);
  });
});
