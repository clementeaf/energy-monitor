import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackfillJob } from '../platform/entities/backfill-job.entity';
import { CreateBackfillJobDto } from './dto/create-backfill-job.dto';
import { BACKFILL_WORKER, type BackfillWorker } from './backfill.worker';

@Injectable()
export class BackfillJobsService {
  constructor(
    @InjectRepository(BackfillJob)
    private readonly repo: Repository<BackfillJob>,
    @Inject(BACKFILL_WORKER)
    private readonly worker: BackfillWorker,
  ) {}

  /**
   * Lists backfill jobs for a tenant ordered by creation time.
   */
  async findAll(tenantId: string): Promise<BackfillJob[]> {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Creates a pending backfill job.
   */
  async create(tenantId: string, dto: CreateBackfillJobDto): Promise<BackfillJob> {
    const job = this.repo.create({
      tenantId,
      meterId: dto.meterId,
      fromTs: new Date(dto.fromTs),
      toTs: new Date(dto.toTs),
      status: 'pending',
      rowsInserted: 0,
      error: null,
    });
    return this.repo.save(job);
  }

  /**
   * Runs the backfill worker stub for a pending job.
   */
  async processJob(jobId: string, tenantId: string): Promise<BackfillJob> {
    const job = await this.repo.findOneBy({ id: jobId, tenantId });
    if (!job) throw new NotFoundException('Backfill job not found');

    job.status = 'running';
    await this.repo.save(job);

    try {
      const result = await this.worker.execute(job);
      job.status = 'completed';
      job.rowsInserted = result.rowsInserted;
      job.error = null;
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : 'Unknown error';
    }

    return this.repo.save(job);
  }
}
