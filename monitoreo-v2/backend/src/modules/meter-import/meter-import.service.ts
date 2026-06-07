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
import { MeterHierarchy } from '../platform/entities/meter-hierarchy.entity';
import { MetersService } from '../meters/meters.service';
import { MeterImportJob } from './entities/meter-import-job.entity';
import { MeterImportStagingRow } from './entities/meter-import-staging-row.entity';
import { MeterImportParseService } from './meter-import-parse.service';
import type {
  MeterImportSummary,
  MeterImportUploadFile,
  ParsedMeterImportRow,
} from './meter-import.types';
import { detectUserImportFormat } from '../user-import/user-import.parser';

const COMMIT_CONCURRENCY = 5;
const DEFAULT_JOB_LIST_LIMIT = 20;

export interface MeterImportJobResponse {
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
  errorSummary: string | null;
  committedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeterImportStagingRowResponse {
  id: string;
  rowNumber: number;
  name: string | null;
  code: string | null;
  buildingCode: string | null;
  externalSiteId: string | null;
  meterType: string | null;
  model: string | null;
  phaseType: string | null;
  loadCategory: string | null;
  parentMeterCode: string | null;
  hierarchyNodeName: string | null;
  status: string;
  errorCodes: string[];
  resolvedBuildingId: string | null;
  resolvedParentMeterId: string | null;
  resolvedHierarchyNodeId: string | null;
  createdMeterId: string | null;
}

/**
 * Orchestrates meter import jobs: validate uploads, preview staging, commit meters.
 */
@Injectable()
export class MeterImportService {
  private readonly logger = new Logger(MeterImportService.name);

  constructor(
    @InjectRepository(MeterImportJob)
    private readonly jobRepo: Repository<MeterImportJob>,
    @InjectRepository(MeterImportStagingRow)
    private readonly stagingRepo: Repository<MeterImportStagingRow>,
    @InjectRepository(MeterHierarchy)
    private readonly meterHierarchyRepo: Repository<MeterHierarchy>,
    private readonly parseService: MeterImportParseService,
    private readonly metersService: MetersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a job, parses upload, and persists staging preview rows.
   * @param file - Multipart upload
   * @param user - Authenticated admin
   * @returns Job id and validation summary
   */
  async validateUpload(
    file: MeterImportUploadFile,
    user: JwtPayload,
  ): Promise<{ jobId: string; summary: MeterImportSummary }> {
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
      const context = await this.parseService.loadTenantContext(tenantId);
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
        `[METER_IMPORT] validated job=${savedJob.id} tenant=${tenantId} total=${parsed.summary.totalRows} valid=${parsed.summary.validRows}`,
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
  ): Promise<{ data: MeterImportJobResponse[]; total: number }> {
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
  ): Promise<{ job: MeterImportJobResponse; summary: MeterImportSummary }> {
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
  ): Promise<{ data: MeterImportStagingRowResponse[]; total: number; limit: number; offset: number }> {
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
   * Commits valid staging rows as tenant meters (parents before children).
   * @param jobId - Import job UUID
   * @param user - Authenticated admin
   * @returns Commit result counts
   */
  async commitJob(
    jobId: string,
    user: JwtPayload,
  ): Promise<{ jobId: string; created: number; skipped: number; failed: number }> {
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
    const createdByCode = new Map<string, string>();

    const pendingRows = [...validRows];
    let progress = true;

    while (pendingRows.length > 0 && progress) {
      progress = false;
      const nextPass: MeterImportStagingRow[] = [];

      for (const row of pendingRows) {
        const parentId = this.resolveParentAtCommit(row, createdByCode);
        if (row.parentMeterCode?.trim() && !parentId && !row.resolvedParentMeterId) {
          nextPass.push(row);
          continue;
        }

        progress = true;
        try {
          const meter = await this.metersService.create(tenantId, {
            buildingId: row.resolvedBuildingId!,
            name: row.name!,
            code: row.code!,
            meterType: row.meterType ?? undefined,
            isActive: row.isActive ?? true,
            model: row.model ?? undefined,
            serialNumber: row.serialNumber ?? undefined,
            phaseType: row.phaseType ?? undefined,
            loadCategory: row.loadCategory ?? undefined,
            parentMeterId: parentId,
            modbusAddress: row.modbusAddress ?? undefined,
            busId: row.busId ?? undefined,
            uplinkRoute: row.uplinkRoute ?? undefined,
            externalId: row.externalId ?? undefined,
          });

          if (row.resolvedHierarchyNodeId) {
            await this.linkMeterToHierarchy(meter.id, row.resolvedHierarchyNodeId);
          }

          row.status = 'created';
          row.createdMeterId = meter.id;
          row.resolvedParentMeterId = parentId;
          await this.stagingRepo.save(row);

          if (row.code) {
            createdByCode.set(row.code.toLowerCase(), meter.id);
          }
          created += 1;
        } catch (err) {
          row.status = 'error';
          row.errorCodes = [...row.errorCodes, 'COMMIT_FAILED'];
          await this.stagingRepo.save(row);
          failed += 1;
          this.logger.warn(
            `[METER_IMPORT] commit row=${row.rowNumber} failed: ${err instanceof Error ? err.message : 'unknown'}`,
          );
        }
      }

      if (nextPass.length === pendingRows.length) {
        for (const row of nextPass) {
          row.status = 'error';
          row.errorCodes = [...row.errorCodes, 'PARENT_METER_NOT_FOUND'];
          await this.stagingRepo.save(row);
          failed += 1;
        }
        break;
      }

      pendingRows.length = 0;
      pendingRows.push(...nextPass);
    }

    job.status = 'committed';
    job.createdRows = created;
    job.committedAt = new Date();
    job.errorRows = job.errorRows + failed;
    job.validRows = Math.max(0, job.validRows - failed);
    await this.jobRepo.save(job);

    await this.writeAuditLog(tenantId, user.sub, jobId, { created, skipped, failed });

    this.logger.log(
      `[METER_IMPORT] committed job=${jobId} tenant=${tenantId} created=${created} skipped=${skipped} failed=${failed}`,
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
   * Resolves parent meter id at commit from DB staging or same-file creations.
   * @param row - Staging row
   * @param createdByCode - Map of codes created in this commit
   * @returns Parent meter UUID or null
   */
  private resolveParentAtCommit(
    row: MeterImportStagingRow,
    createdByCode: Map<string, string>,
  ): string | null {
    if (row.resolvedParentMeterId) {
      return row.resolvedParentMeterId;
    }
    if (!row.parentMeterCode?.trim()) {
      return null;
    }
    return createdByCode.get(row.parentMeterCode.trim().toLowerCase()) ?? null;
  }

  /**
   * Links a meter to a hierarchy node (idempotent upsert).
   * @param meterId - Created meter UUID
   * @param hierarchyNodeId - Resolved hierarchy node UUID
   */
  private async linkMeterToHierarchy(meterId: string, hierarchyNodeId: string): Promise<void> {
    const existing = await this.meterHierarchyRepo.findOne({
      where: { meterId, hierarchyNodeId },
    });
    if (!existing) {
      await this.meterHierarchyRepo.save(
        this.meterHierarchyRepo.create({ meterId, hierarchyNodeId }),
      );
    }
  }

  /**
   * Loads a tenant-scoped job or throws 404.
   * @param jobId - Job UUID
   * @param user - Authenticated user
   * @returns Job entity
   */
  private async findJobOrThrow(jobId: string, user: JwtPayload): Promise<MeterImportJob> {
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
    row: ParsedMeterImportRow,
  ): MeterImportStagingRow {
    return this.stagingRepo.create({
      jobId,
      tenantId,
      rowNumber: row.rowNumber,
      rawCells: row.rawCells,
      name: row.name,
      code: row.code,
      buildingCode: row.buildingCode,
      externalSiteId: row.externalSiteId,
      meterType: row.meterType,
      model: row.model,
      serialNumber: row.serialNumber,
      phaseType: row.phaseType,
      loadCategory: row.loadCategory,
      parentMeterCode: row.parentMeterCode,
      hierarchyNodeName: row.hierarchyNodeName,
      modbusAddress: row.modbusAddress,
      busId: row.busId,
      uplinkRoute: row.uplinkRoute,
      externalId: row.externalId,
      isActive: row.isActive,
      status: row.status,
      errorCodes: row.errorCodes,
      resolvedBuildingId: row.resolvedBuildingId,
      resolvedParentMeterId: row.resolvedParentMeterId,
      resolvedHierarchyNodeId: row.resolvedHierarchyNodeId,
    });
  }

  /**
   * Serializes job entity for API responses.
   * @param job - Job entity
   * @returns JSON-safe job
   */
  private toJobResponse(job: MeterImportJob): MeterImportJobResponse {
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
  private toStagingResponse(row: MeterImportStagingRow): MeterImportStagingRowResponse {
    return {
      id: row.id,
      rowNumber: row.rowNumber,
      name: row.name,
      code: row.code,
      buildingCode: row.buildingCode,
      externalSiteId: row.externalSiteId,
      meterType: row.meterType,
      model: row.model,
      phaseType: row.phaseType,
      loadCategory: row.loadCategory,
      parentMeterCode: row.parentMeterCode,
      hierarchyNodeName: row.hierarchyNodeName,
      status: row.status,
      errorCodes: row.errorCodes,
      resolvedBuildingId: row.resolvedBuildingId,
      resolvedParentMeterId: row.resolvedParentMeterId,
      resolvedHierarchyNodeId: row.resolvedHierarchyNodeId,
      createdMeterId: row.createdMeterId,
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
         VALUES ($1, $2, 'meter_import.commit', 'meter_import_job', $3, $4)`,
        [tenantId, userId, jobId, JSON.stringify(details)],
      );
    } catch (err) {
      this.logger.warn(
        `Audit log write failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
