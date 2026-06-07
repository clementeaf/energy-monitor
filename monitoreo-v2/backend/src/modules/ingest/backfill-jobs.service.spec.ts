import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BackfillJobsService } from './backfill-jobs.service';
import { BackfillJob } from '../platform/entities/backfill-job.entity';
import { BACKFILL_WORKER } from './backfill.worker';

describe('BackfillJobsService', () => {
  let service: BackfillJobsService;
  let repo: Record<string, jest.Mock>;
  let workerExecute: jest.Mock;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve({ id: 'job-1', ...entity })),
      findOneBy: jest.fn(),
    };
    workerExecute = jest.fn().mockResolvedValue({ rowsInserted: 0 });

    const module = await Test.createTestingModule({
      providers: [
        BackfillJobsService,
        { provide: getRepositoryToken(BackfillJob), useValue: repo },
        { provide: BACKFILL_WORKER, useValue: { execute: workerExecute } },
      ],
    }).compile();

    service = module.get(BackfillJobsService);
  });

  it('creates pending backfill job', async () => {
    const result = await service.create('t-1', {
      meterId: 'm-1',
      fromTs: '2026-01-01T00:00:00Z',
      toTs: '2026-01-02T00:00:00Z',
    });

    expect(result.status).toBe('pending');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't-1', meterId: 'm-1' }),
    );
  });

  it('processJob runs worker stub and completes', async () => {
    const job: Partial<BackfillJob> = {
      id: 'job-1',
      tenantId: 't-1',
      meterId: 'm-1',
      status: 'pending',
      rowsInserted: 0,
      error: null,
    };
    repo.findOneBy.mockResolvedValue({ ...job });
    repo.save.mockImplementation((entity) => Promise.resolve(entity));

    const result = await service.processJob('job-1', 't-1');

    expect(workerExecute).toHaveBeenCalled();
    expect(result.status).toBe('completed');
    expect(result.rowsInserted).toBe(0);
  });

  it('processJob throws when job not found', async () => {
    repo.findOneBy.mockResolvedValue(null);
    await expect(service.processJob('missing', 't-1')).rejects.toThrow(NotFoundException);
  });
});
