import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { UserImportController } from './user-import.controller';
import { UserImportService } from './user-import.service';
import type { UserImportUploadFile } from './user-import.types';

const admin: JwtPayload = {
  sub: 'u-admin',
  email: 'admin@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'tenant_admin',
  permissions: ['admin_users:create', 'admin_users:read'],
  buildingIds: [],
};

describe('UserImportController', () => {
  let controller: UserImportController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      validateUpload: jest.fn(),
      listJobs: jest.fn(),
      getJob: jest.fn(),
      getJobRows: jest.fn(),
      commitJob: jest.fn(),
      cancelJob: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [UserImportController],
      providers: [{ provide: UserImportService, useValue: service }],
    }).compile();

    controller = module.get(UserImportController);
  });

  it('downloadTemplate sends CSV attachment', () => {
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    controller.downloadTemplate(res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="usuarios-import-v1.csv"',
    );
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('listJobs delegates to service', async () => {
    service.listJobs.mockResolvedValue({ data: [], total: 0 });
    const result = await controller.listJobs(admin, '10', '0');
    expect(service.listJobs).toHaveBeenCalledWith(admin, 10, 0);
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('validateUpload delegates to service', async () => {
    const file: UserImportUploadFile = { buffer: Buffer.from('x'), originalname: 'u.csv' };
    service.validateUpload.mockResolvedValue({ jobId: 'j-1', summary: { totalRows: 1, validRows: 1, errorRows: 0, duplicateRows: 0 } });
    const result = await controller.validateUpload(file, admin);
    expect(service.validateUpload).toHaveBeenCalledWith(file, admin);
    expect(result.jobId).toBe('j-1');
  });

  it('getJob delegates to service', async () => {
    service.getJob.mockResolvedValue({ job: { id: 'j-1' }, summary: {} });
    await controller.getJob('j-1', admin);
    expect(service.getJob).toHaveBeenCalledWith('j-1', admin);
  });

  it('getJobRows delegates with query dto', async () => {
    service.getJobRows.mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0 });
    await controller.getJobRows('j-1', { limit: 25, offset: 0 }, admin);
    expect(service.getJobRows).toHaveBeenCalledWith('j-1', admin, { limit: 25, offset: 0 });
  });

  it('commitJob passes ageVerified to service', async () => {
    service.commitJob.mockResolvedValue({ jobId: 'j-1', created: 2, skipped: 0, failed: 0 });
    const result = await controller.commitJob('j-1', admin, { ageVerified: true });
    expect(service.commitJob).toHaveBeenCalledWith('j-1', admin, true);
    expect(result.created).toBe(2);
  });

  it('cancelJob delegates to service', async () => {
    service.cancelJob.mockResolvedValue(undefined);
    await controller.cancelJob('j-1', admin);
    expect(service.cancelJob).toHaveBeenCalledWith('j-1', admin);
  });

  it('listJobs uses default pagination when query omitted', async () => {
    service.listJobs.mockResolvedValue({ data: [], total: 0 });
    await controller.listJobs(admin);
    expect(service.listJobs).toHaveBeenCalledWith(admin, undefined, undefined);
  });
});
