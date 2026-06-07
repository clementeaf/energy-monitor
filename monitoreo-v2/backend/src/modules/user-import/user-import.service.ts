import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { UserImportJob } from './entities/user-import-job.entity';
import { UserImportStagingRow } from './entities/user-import-staging-row.entity';
import { UserImportParseService } from './user-import-parse.service';
import type { ParsedUserImportRow, UserImportSummary, UserImportUploadFile } from './user-import.types';
import { detectUserImportFormat } from './user-import.parser';

const NOTIFY_CONCURRENCY = 5;
const DEFAULT_JOB_LIST_LIMIT = 20;

export interface UserImportJobResponse {
  id: string;
  tenantId: string;
  originalFilename: string;
  fileFormat: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  createdRows: number;
  ageVerifiedAtCommit: boolean;
  errorSummary: string | null;
  committedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserImportStagingRowResponse {
  id: string;
  rowNumber: number;
  email: string | null;
  displayName: string | null;
  authProvider: string | null;
  roleSlug: string | null;
  buildingCodesRaw: string | null;
  phone: string | null;
  status: string;
  errorCodes: string[];
  resolvedRoleId: string | null;
  resolvedBuildingIds: string[];
  createdUserId: string | null;
}

/**
 * Orchestrates user import jobs: validate uploads, preview staging, commit users.
 */
@Injectable()
export class UserImportService {
  private readonly logger = new Logger(UserImportService.name);

  constructor(
    @InjectRepository(UserImportJob)
    private readonly jobRepo: Repository<UserImportJob>,
    @InjectRepository(UserImportStagingRow)
    private readonly stagingRepo: Repository<UserImportStagingRow>,
    private readonly parseService: UserImportParseService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a job, parses upload, and persists staging preview rows.
   * @param file - Multipart upload
   * @param user - Authenticated admin
   * @returns Job id and validation summary
   */
  async validateUpload(
    file: UserImportUploadFile,
    user: JwtPayload,
  ): Promise<{ jobId: string; summary: UserImportSummary }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }

    const tenantId = this.requireTenantId(user);
    const format = detectUserImportFormat(file.buffer, file.originalname, file.mimetype);

    const job = this.jobRepo.create({
      tenantId,
      createdByUserId: user.sub,
      originalFilename: file.originalname,
      fileFormat: format,
      status: 'pending_parse',
    });
    const savedJob = await this.jobRepo.save(job);

    try {
      const context = await this.parseService.loadTenantContext(
        tenantId,
        user.roleId,
        user.roleSlug,
      );
      const parsed = await this.parseService.parseAndValidateFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        context,
      );

      const stagingEntities = parsed.rows.map((row) => this.toStagingEntity(savedJob.id, tenantId, row));
      await this.stagingRepo.save(stagingEntities);

      savedJob.status = 'ready';
      savedJob.totalRows = parsed.summary.totalRows;
      savedJob.validRows = parsed.summary.validRows;
      savedJob.errorRows = parsed.summary.errorRows;
      savedJob.duplicateRows = parsed.summary.duplicateRows;
      await this.jobRepo.save(savedJob);

      this.logger.log(
        `[USER_IMPORT] validated job=${savedJob.id} tenant=${tenantId} total=${parsed.summary.totalRows} valid=${parsed.summary.validRows}`,
      );

      return { jobId: savedJob.id, summary: parsed.summary };
    } catch (err) {
      savedJob.status = 'failed';
      savedJob.errorSummary = err instanceof Error ? err.message : 'Parse failed';
      await this.jobRepo.save(savedJob);
      throw err;
    }
  }

  /**
   * Lists recent import jobs for the tenant.
   * @param user - Authenticated admin
   * @param limit - Max jobs (default 20)
   * @param offset - Pagination offset
   * @returns Jobs newest first
   */
  async listJobs(
    user: JwtPayload,
    limit = DEFAULT_JOB_LIST_LIMIT,
    offset = 0,
  ): Promise<{ data: UserImportJobResponse[]; total: number }> {
    const tenantId = this.requireTenantId(user);
    const [jobs, total] = await this.jobRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 50),
      skip: offset,
    });
    return { data: jobs.map((job) => this.toJobResponse(job)), total };
  }

  /**
   * Returns job metadata and summary counts.
   * @param jobId - Import job UUID
   * @param user - Authenticated admin
   * @returns Job with summary
   */
  async getJob(
    jobId: string,
    user: JwtPayload,
  ): Promise<{ job: UserImportJobResponse; summary: UserImportSummary }> {
    const job = await this.findJobOrThrow(jobId, user);
    return {
      job: this.toJobResponse(job),
      summary: {
        totalRows: job.totalRows,
        validRows: job.validRows,
        errorRows: job.errorRows,
        duplicateRows: job.duplicateRows,
      },
    };
  }

  /**
   * Returns paginated staging rows for preview.
   * @param jobId - Import job UUID
   * @param user - Authenticated admin
   * @param options - Pagination and status filter
   * @returns Rows page
   */
  async getJobRows(
    jobId: string,
    user: JwtPayload,
    options: { limit?: number; offset?: number; status?: string },
  ): Promise<{ data: UserImportStagingRowResponse[]; total: number; limit: number; offset: number }> {
    await this.findJobOrThrow(jobId, user);
    const tenantId = this.requireTenantId(user);
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    const qb = this.stagingRepo
      .createQueryBuilder('row')
      .where('row.job_id = :jobId', { jobId })
      .andWhere('row.tenant_id = :tenantId', { tenantId })
      .orderBy('row.row_number', 'ASC')
      .skip(offset)
      .take(limit);

    if (options.status) {
      qb.andWhere('row.status = :status', { status: options.status });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => this.toStagingResponse(row)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Commits valid staging rows as tenant users (Ley 21.719 ageVerified required).
   * @param jobId - Import job UUID
   * @param user - Authenticated admin
   * @param ageVerified - Admin batch confirmation
   * @returns Commit result counts
   */
  async commitJob(
    jobId: string,
    user: JwtPayload,
    ageVerified: boolean,
  ): Promise<{ jobId: string; created: number; skipped: number; failed: number }> {
    if (!ageVerified) {
      throw new BadRequestException('Ley 21.719: debe confirmar que los usuarios son mayores de 14 años');
    }

    const job = await this.findJobOrThrow(jobId, user);
    if (job.status !== 'ready') {
      throw new ConflictException(`Job status is ${job.status}; expected ready`);
    }

    const tenantId = this.requireTenantId(user);
    job.status = 'committing';
    await this.jobRepo.save(job);

    const validRows = await this.stagingRepo.find({
      where: { jobId, tenantId, status: 'valid' },
      order: { rowNumber: 'ASC' },
    });

    let created = 0;
    let failed = 0;
    const skipped = job.duplicateRows;

    for (let i = 0; i < validRows.length; i += NOTIFY_CONCURRENCY) {
      const chunk = validRows.slice(i, i + NOTIFY_CONCURRENCY);
      await Promise.all(
        chunk.map(async (row) => {
          try {
            const createdUser = await this.usersService.create(
              tenantId,
              {
                email: row.email!,
                displayName: row.displayName ?? undefined,
                authProvider: row.authProvider!,
                roleId: row.resolvedRoleId!,
                phone: row.phone ?? undefined,
                buildingIds: row.resolvedBuildingIds.length > 0 ? row.resolvedBuildingIds : undefined,
                ageVerified: true,
              },
              user.roleId,
              user.roleSlug,
            );
            row.status = 'created';
            row.createdUserId = createdUser.id;
            await this.stagingRepo.save(row);
            created += 1;
          } catch (err) {
            row.status = 'error';
            row.errorCodes = [...row.errorCodes, 'COMMIT_FAILED'];
            await this.stagingRepo.save(row);
            failed += 1;
            this.logger.warn(
              `[USER_IMPORT] commit row=${row.rowNumber} failed: ${err instanceof Error ? err.message : 'unknown'}`,
            );
          }
        }),
      );
    }

    job.status = 'committed';
    job.createdRows = created;
    job.ageVerifiedAtCommit = true;
    job.committedAt = new Date();
    job.errorRows = job.errorRows + failed;
    job.validRows = Math.max(0, job.validRows - failed);
    await this.jobRepo.save(job);

    await this.writeAuditLog(tenantId, user.sub, jobId, { created, skipped, failed });

    this.logger.log(
      `[USER_IMPORT] committed job=${jobId} tenant=${tenantId} created=${created} skipped=${skipped} failed=${failed}`,
    );

    return { jobId, created, skipped, failed };
  }

  /**
   * Cancels a draft import job.
   * @param jobId - Import job UUID
   * @param user - Authenticated admin
   */
  async cancelJob(jobId: string, user: JwtPayload): Promise<void> {
    const job = await this.findJobOrThrow(jobId, user);
    if (job.status === 'committed' || job.status === 'committing') {
      throw new ConflictException('Cannot cancel a committed job');
    }
    job.status = 'cancelled';
    await this.jobRepo.save(job);
  }

  /**
   * Loads a tenant-scoped job or throws 404.
   * @param jobId - Job UUID
   * @param user - Authenticated user
   * @returns Job entity
   */
  private async findJobOrThrow(jobId: string, user: JwtPayload): Promise<UserImportJob> {
    const tenantId = this.requireTenantId(user);
    const job = await this.jobRepo.findOne({ where: { id: jobId, tenantId } });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return job;
  }

  /**
   * Requires a concrete tenant id (super_admin must select tenant via x-tenant-id).
   * @param user - JWT payload
   * @returns Tenant UUID
   */
  private requireTenantId(user: JwtPayload): string {
    if (user.crossTenant && !user.tenantId) {
      throw new BadRequestException('x-tenant-id header required for cross-tenant import');
    }
    return user.tenantId;
  }

  /**
   * Maps parsed row to staging entity for persistence.
   * @param jobId - Parent job id
   * @param tenantId - Tenant UUID
   * @param row - Parsed validation row
   * @returns Staging entity draft
   */
  private toStagingEntity(
    jobId: string,
    tenantId: string,
    row: ParsedUserImportRow,
  ): UserImportStagingRow {
    return this.stagingRepo.create({
      jobId,
      tenantId,
      rowNumber: row.rowNumber,
      rawCells: row.rawCells,
      email: row.email,
      displayName: row.displayName,
      authProvider: row.authProvider,
      roleSlug: row.roleSlug,
      buildingCodesRaw: row.buildingCodesRaw,
      phone: row.phone,
      status: row.status,
      errorCodes: row.errorCodes,
      resolvedRoleId: row.resolvedRoleId,
      resolvedBuildingIds: row.resolvedBuildingIds,
    });
  }

  /**
   * Serializes job entity for API responses.
   * @param job - Job entity
   * @returns JSON-safe job
   */
  private toJobResponse(job: UserImportJob): UserImportJobResponse {
    return {
      id: job.id,
      tenantId: job.tenantId,
      originalFilename: job.originalFilename,
      fileFormat: job.fileFormat,
      status: job.status,
      totalRows: job.totalRows,
      validRows: job.validRows,
      errorRows: job.errorRows,
      duplicateRows: job.duplicateRows,
      createdRows: job.createdRows,
      ageVerifiedAtCommit: job.ageVerifiedAtCommit,
      errorSummary: job.errorSummary,
      committedAt: job.committedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  /**
   * Serializes staging row for API responses.
   * @param row - Staging entity
   * @returns JSON-safe row
   */
  private toStagingResponse(row: UserImportStagingRow): UserImportStagingRowResponse {
    return {
      id: row.id,
      rowNumber: row.rowNumber,
      email: row.email,
      displayName: row.displayName,
      authProvider: row.authProvider,
      roleSlug: row.roleSlug,
      buildingCodesRaw: row.buildingCodesRaw,
      phone: row.phone,
      status: row.status,
      errorCodes: row.errorCodes,
      resolvedRoleId: row.resolvedRoleId,
      resolvedBuildingIds: row.resolvedBuildingIds,
      createdUserId: row.createdUserId,
    };
  }

  /**
   * Writes audit log entry for import commit.
   * @param tenantId - Tenant UUID
   * @param userId - Admin user id
   * @param jobId - Import job id
   * @param details - Commit stats
   */
  private async writeAuditLog(
    tenantId: string,
    userId: string,
    jobId: string,
    details: { created: number; skipped: number; failed: number },
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, 'user_import.commit', 'user_import_job', $3, $4)`,
        [tenantId, userId, jobId, JSON.stringify(details)],
      );
    } catch (err) {
      this.logger.warn(
        `Audit log write failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
