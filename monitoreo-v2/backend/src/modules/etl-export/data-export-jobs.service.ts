import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  DataExportJob,
  type DataExportJobParams,
} from '../platform/entities/data-export-job.entity';
import { CreateExportJobDto } from './dto/create-export-job.dto';
import { ReadingsExportService } from './readings-export.service';
import { ExportStorageService } from './export-storage.service';
import {
  readingsToCsvBuffer,
  writeReadingsParquetFile,
} from './lib/readings-serializer';

export interface ExportJobStatusResponse {
  id: string;
  format: string;
  status: string;
  rowCount: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  downloadUrl: string | null;
}

@Injectable()
export class DataExportJobsService {
  private readonly logger = new Logger(DataExportJobsService.name);

  constructor(
    @InjectRepository(DataExportJob)
    private readonly repo: Repository<DataExportJob>,
    private readonly readingsExportService: ReadingsExportService,
    private readonly storageService: ExportStorageService,
  ) {}

  /**
   * Creates a pending export job and starts async processing.
   */
  async create(
    tenantId: string,
    buildingIds: string[],
    dto: CreateExportJobDto,
  ): Promise<DataExportJob> {
    const params: DataExportJobParams = {
      from: dto.from,
      to: dto.to,
      meterId: dto.meterId,
      buildingId: dto.buildingId,
    };

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const job = await this.repo.save(
      this.repo.create({
        tenantId,
        format: dto.format,
        status: 'pending',
        params,
        s3Key: null,
        localPath: null,
        rowCount: 0,
        error: null,
        expiresAt,
      }),
    );

    void this.processJobAsync(job.id, tenantId, buildingIds);
    return job;
  }

  /**
   * Returns export job status with optional presigned download URL.
   */
  async getStatus(id: string, tenantId: string): Promise<ExportJobStatusResponse> {
    const job = await this.repo.findOneBy({ id, tenantId });
    if (!job) throw new NotFoundException('Export job not found');

    let downloadUrl: string | null = null;
    if (job.status === 'completed' && job.s3Key) {
      downloadUrl = await this.storageService.getSignedDownloadUrl(job.s3Key);
    } else if (job.status === 'completed' && job.localPath) {
      downloadUrl = `/v1/exports/${job.id}/download`;
    }

    return {
      id: job.id,
      format: job.format,
      status: job.status,
      rowCount: job.rowCount,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      expiresAt: job.expiresAt,
      downloadUrl,
    };
  }

  /**
   * Loads a completed job for binary download (local storage path).
   */
  async getJobForDownload(id: string, tenantId: string): Promise<DataExportJob> {
    const job = await this.repo.findOneBy({ id, tenantId });
    if (!job) throw new NotFoundException('Export job not found');
    if (job.status !== 'completed' || !job.localPath) {
      throw new NotFoundException('Export file not available');
    }
    return job;
  }

  /**
   * Runs export job processing in the background.
   */
  private async processJobAsync(
    jobId: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<void> {
    const job = await this.repo.findOneBy({ id: jobId, tenantId });
    if (!job) return;

    job.status = 'running';
    await this.repo.save(job);

    try {
      const rows = await this.readingsExportService.fetchAllForExport(
        tenantId,
        buildingIds,
        job.params,
      );

      const ext = job.format === 'parquet' ? 'parquet' : 'csv';
      const storageKey = `exports/${tenantId}/${job.id}.${ext}`;
      let body: Buffer;

      if (job.format === 'parquet') {
        const tmpPath = path.join(os.tmpdir(), `export-${job.id}.parquet`);
        await writeReadingsParquetFile(tmpPath, rows);
        body = fs.readFileSync(tmpPath);
        fs.unlinkSync(tmpPath);
      } else {
        body = readingsToCsvBuffer(rows);
      }

      const stored = await this.storageService.putFile(storageKey, body);
      job.status = 'completed';
      job.rowCount = rows.length;
      job.s3Key = stored.s3Key;
      job.localPath = stored.localPath;
      job.error = null;
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Export job ${jobId} failed: ${job.error}`);
    }

    await this.repo.save(job);
  }
}
