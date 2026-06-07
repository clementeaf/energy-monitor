import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { UserImportJob } from './entities/user-import-job.entity';
import { UserImportStagingRow } from './entities/user-import-staging-row.entity';
import { UserImportParseService } from './user-import-parse.service';
import { UserImportService } from './user-import.service';
import type { UserImportUploadFile } from './user-import.types';

const TENANT_ID = 't-1';
const JOB_ID = 'job-1';

const admin: JwtPayload = {
  sub: 'u-admin',
  email: 'admin@test.com',
  tenantId: TENANT_ID,
  roleId: 'r-admin',
  roleSlug: 'tenant_admin',
  permissions: ['admin_users:create', 'admin_users:read'],
  buildingIds: [],
};

const readyJob: UserImportJob = {
  id: JOB_ID,
  tenantId: TENANT_ID,
  createdByUserId: admin.sub,
  tenant: {} as UserImportJob['tenant'],
  createdByUser: null,
  originalFilename: 'users.csv',
  fileFormat: 'csv',
  status: 'ready',
  totalRows: 5,
  validRows: 3,
  errorRows: 1,
  duplicateRows: 1,
  createdRows: 0,
  ageVerifiedAtCommit: false,
  errorSummary: null,
  committedAt: null,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
};

const validStagingRow = (email: string, rowNumber: number): UserImportStagingRow => ({
  id: `row-${rowNumber}`,
  jobId: JOB_ID,
  tenantId: TENANT_ID,
  job: readyJob,
  tenant: {} as UserImportStagingRow['tenant'],
  rowNumber,
  rawCells: { email },
  email,
  displayName: 'Test User',
  authProvider: 'microsoft',
  roleSlug: 'operator',
  buildingCodesRaw: null,
  phone: null,
  status: 'valid',
  errorCodes: [],
  resolvedRoleId: 'r-operator',
  resolvedBuildingIds: [],
  createdUserId: null,
  createdUser: null,
  createdAt: new Date(),
});

describe('UserImportService', () => {
  let service: UserImportService;
  let jobRepo: Record<string, jest.Mock>;
  let stagingRepo: Record<string, jest.Mock>;
  let parseService: Record<string, jest.Mock>;
  let usersService: Record<string, jest.Mock>;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    jobRepo = {
      create: jest.fn((data) => ({ id: JOB_ID, ...data })),
      save: jest.fn(async (job) => job),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    };
    stagingRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (rows) => rows),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    parseService = {
      loadTenantContext: jest.fn(),
      parseAndValidateFile: jest.fn(),
    };
    usersService = {
      create: jest.fn(),
    };
    dataSource = { query: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        UserImportService,
        { provide: getRepositoryToken(UserImportJob), useValue: jobRepo },
        { provide: getRepositoryToken(UserImportStagingRow), useValue: stagingRepo },
        { provide: UserImportParseService, useValue: parseService },
        { provide: UsersService, useValue: usersService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(UserImportService);
  });

  describe('validateUpload', () => {
    it('throws when file is missing', async () => {
      await expect(
        service.validateUpload(undefined as unknown as UserImportUploadFile, admin),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates job and staging rows on success', async () => {
      parseService.loadTenantContext.mockResolvedValue({ tenantId: TENANT_ID });
      parseService.parseAndValidateFile.mockResolvedValue({
        summary: { totalRows: 2, validRows: 2, errorRows: 0, duplicateRows: 0 },
        rows: [
          {
            rowNumber: 2,
            rawCells: { email: 'a@test.com' },
            email: 'a@test.com',
            displayName: null,
            authProvider: 'google',
            roleSlug: 'operator',
            buildingCodesRaw: null,
            phone: null,
            status: 'valid',
            errorCodes: [],
            resolvedRoleId: 'r-op',
            resolvedBuildingIds: [],
          },
        ],
      });

      const file: UserImportUploadFile = {
        buffer: Buffer.from('email,auth_provider,role_slug\na@test.com,google,operator'),
        originalname: 'users.csv',
        mimetype: 'text/csv',
      };

      const result = await service.validateUpload(file, admin);

      expect(result.jobId).toBe(JOB_ID);
      expect(result.summary.validRows).toBe(2);
      expect(stagingRepo.save).toHaveBeenCalled();
      expect(jobRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready', validRows: 2 }),
      );
    });
  });

  describe('commitJob', () => {
    it('throws 400 when ageVerified is false', async () => {
      jobRepo.findOne.mockResolvedValue(readyJob);
      await expect(service.commitJob(JOB_ID, admin, false)).rejects.toThrow(BadRequestException);
    });

    it('throws 409 when job is not ready', async () => {
      jobRepo.findOne.mockResolvedValue({ ...readyJob, status: 'committed' });
      await expect(service.commitJob(JOB_ID, admin, true)).rejects.toThrow(ConflictException);
    });

    it('creates 3 users from valid rows and skips duplicates', async () => {
      jobRepo.findOne.mockResolvedValue({ ...readyJob });
      const validRows = [
        validStagingRow('a@test.com', 2),
        validStagingRow('b@test.com', 3),
        validStagingRow('c@test.com', 4),
      ];
      stagingRepo.find.mockResolvedValue(validRows);
      usersService.create.mockImplementation(async (_tenantId, dto) => ({
        id: `user-${dto.email}`,
        email: dto.email,
      }));

      const result = await service.commitJob(JOB_ID, admin, true);

      expect(result.created).toBe(3);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
      expect(usersService.create).toHaveBeenCalledTimes(3);
      expect(usersService.create).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ email: 'a@test.com', ageVerified: true }),
        admin.roleId,
        admin.roleSlug,
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('user_import.commit'),
        expect.arrayContaining([TENANT_ID, admin.sub, JOB_ID]),
      );
    });
  });

  describe('getJob', () => {
    it('throws NotFoundException for unknown job', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(service.getJob('missing', admin)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelJob', () => {
    it('throws ConflictException when job already committed', async () => {
      jobRepo.findOne.mockResolvedValue({ ...readyJob, status: 'committed' });
      await expect(service.cancelJob(JOB_ID, admin)).rejects.toThrow(ConflictException);
    });

    it('sets status cancelled for draft job', async () => {
      jobRepo.findOne.mockResolvedValue({ ...readyJob, status: 'ready' });
      await service.cancelJob(JOB_ID, admin);
      expect(jobRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    });
  });
});
