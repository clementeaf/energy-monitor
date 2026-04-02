import { Test } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const admin: JwtPayload = {
  sub: 'u-admin',
  email: 'admin@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: ['audit:read'],
  buildingIds: [],
};

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = { findAll: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: AuditLogsService, useValue: service }],
    }).compile();

    controller = module.get(AuditLogsController);
  });

  it('findAll delegates to service with tenantId and dto', async () => {
    const result = { data: [], total: 0 };
    service.findAll.mockResolvedValue(result);

    const dto = { limit: 20, offset: 0 };
    const response = await controller.findAll(admin, dto);

    expect(service.findAll).toHaveBeenCalledWith('t-1', dto);
    expect(response).toEqual(result);
  });

  it('passes filter parameters through', async () => {
    service.findAll.mockResolvedValue({ data: [], total: 0 });

    const dto = { userId: 'u-1', action: 'POST', from: '2026-04-01T00:00:00Z' };
    await controller.findAll(admin, dto);

    expect(service.findAll).toHaveBeenCalledWith('t-1', dto);
  });
});
