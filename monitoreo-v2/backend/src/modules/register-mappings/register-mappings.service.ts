import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterMapping } from '../platform/entities/register-mapping.entity';
import { ProtocolType } from '../platform/entities/protocol-type.entity';
import { CreateRegisterMappingDto } from './dto/create-register-mapping.dto';
import { UpdateRegisterMappingDto } from './dto/update-register-mapping.dto';
import { QueryRegisterMappingsDto } from './dto/query-register-mappings.dto';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { csvRow } from '../etl-export/lib/export-cursor';

const CSV_HEADER = [
  'tenant_id',
  'protocol',
  'device_profile',
  'register_key',
  'target_field',
  'scale_factor',
  'unit',
].join(',');

@Injectable()
export class RegisterMappingsService {
  constructor(
    @InjectRepository(RegisterMapping)
    private readonly mappingRepo: Repository<RegisterMapping>,
    @InjectRepository(ProtocolType)
    private readonly protocolRepo: Repository<ProtocolType>,
  ) {}

  /**
   * Lists protocol types from catalog.
   */
  async listProtocolTypes(): Promise<ProtocolType[]> {
    return this.protocolRepo.find({ order: { code: 'ASC' } });
  }

  /**
   * Lists register mappings visible to the caller (tenant + global templates).
   */
  async findAll(
    user: JwtPayload,
    filters: QueryRegisterMappingsDto,
  ): Promise<RegisterMapping[]> {
    const scopeTenantId = this.resolveScopeTenantId(user, filters.tenantId);
    const globalOnly = filters.globalOnly === 'true';

    const qb = this.mappingRepo
      .createQueryBuilder('m')
      .orderBy('m.protocol', 'ASC')
      .addOrderBy('m.deviceProfile', 'ASC')
      .addOrderBy('m.registerKey', 'ASC');

    if (globalOnly) {
      qb.where('m.tenant_id IS NULL');
    } else if (scopeTenantId) {
      qb.where('(m.tenant_id = :tenantId OR m.tenant_id IS NULL)', {
        tenantId: scopeTenantId,
      });
    }

    if (filters.protocol) {
      qb.andWhere('m.protocol = :protocol', { protocol: filters.protocol });
    }

    if (filters.deviceProfile) {
      qb.andWhere('m.device_profile = :deviceProfile', {
        deviceProfile: filters.deviceProfile,
      });
    }

    return qb.getMany();
  }

  /**
   * Finds one mapping if visible to caller.
   */
  async findOne(id: string, user: JwtPayload): Promise<RegisterMapping | null> {
    const row = await this.mappingRepo.findOneBy({ id });
    if (!row) return null;
    if (!this.canRead(row, user)) return null;
    return row;
  }

  /**
   * Creates a tenant or global register mapping.
   */
  async create(user: JwtPayload, dto: CreateRegisterMappingDto): Promise<RegisterMapping> {
    const tenantId = this.resolveWriteTenantId(user, dto);

    const entity = this.mappingRepo.create({
      tenantId,
      protocol: dto.protocol,
      deviceProfile: dto.deviceProfile,
      registerKey: dto.registerKey,
      targetField: dto.targetField,
      scaleFactor: String(dto.scaleFactor),
      unit: dto.unit ?? null,
    });

    try {
      return await this.mappingRepo.save(entity);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Register mapping already exists for this key');
      }
      throw err;
    }
  }

  /**
   * Updates a mapping when caller owns it or is super_admin on global template.
   */
  async update(
    id: string,
    user: JwtPayload,
    dto: UpdateRegisterMappingDto,
  ): Promise<RegisterMapping | null> {
    const row = await this.mappingRepo.findOneBy({ id });
    if (!row || !this.canWrite(row, user)) return null;

    if (dto.protocol !== undefined) row.protocol = dto.protocol;
    if (dto.deviceProfile !== undefined) row.deviceProfile = dto.deviceProfile;
    if (dto.registerKey !== undefined) row.registerKey = dto.registerKey;
    if (dto.targetField !== undefined) row.targetField = dto.targetField;
    if (dto.scaleFactor !== undefined) row.scaleFactor = String(dto.scaleFactor);
    if (dto.unit !== undefined) row.unit = dto.unit;

    try {
      return await this.mappingRepo.save(row);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Register mapping already exists for this key');
      }
      throw err;
    }
  }

  /**
   * Deletes a mapping when caller has write access.
   */
  async remove(id: string, user: JwtPayload): Promise<boolean> {
    const row = await this.mappingRepo.findOneBy({ id });
    if (!row || !this.canWrite(row, user)) return false;
    const result = await this.mappingRepo.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Exports visible mappings as CSV bytes for equivalence matrix download.
   */
  async exportCsv(user: JwtPayload, filters: QueryRegisterMappingsDto): Promise<Buffer> {
    const rows = await this.findAll(user, filters);
    const lines = [CSV_HEADER];

    for (const row of rows) {
      lines.push(
        csvRow([
          row.tenantId ?? '',
          row.protocol,
          row.deviceProfile,
          row.registerKey,
          row.targetField,
          row.scaleFactor,
          row.unit ?? '',
        ]),
      );
    }

    return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
  }

  /**
   * Resolves tenant filter for list/export queries.
   */
  private resolveScopeTenantId(user: JwtPayload, requestedTenantId?: string): string | null {
    if (user.crossTenant && requestedTenantId) return requestedTenantId;
    if (user.crossTenant && !requestedTenantId) return null;
    return user.tenantId;
  }

  /**
   * Resolves tenant_id for new mapping rows.
   */
  private resolveWriteTenantId(
    user: JwtPayload,
    dto: CreateRegisterMappingDto,
  ): string | null {
    if (dto.isGlobalTemplate) {
      if (user.roleSlug !== 'super_admin') {
        throw new ForbiddenException('Only super_admin can create global templates');
      }
      return null;
    }

    if (dto.tenantId) {
      if (!user.crossTenant && dto.tenantId !== user.tenantId) {
        throw new ForbiddenException('Cross-tenant mapping create denied');
      }
      return dto.tenantId;
    }

    return user.tenantId;
  }

  /**
   * True when user can read the mapping row.
   */
  private canRead(row: RegisterMapping, user: JwtPayload): boolean {
    if (user.roleSlug === 'super_admin' || user.crossTenant) return true;
    if (row.tenantId === null) return true;
    return row.tenantId === user.tenantId;
  }

  /**
   * True when user can mutate the mapping row.
   */
  private canWrite(row: RegisterMapping, user: JwtPayload): boolean {
    if (user.roleSlug === 'super_admin') return true;
    if (row.tenantId === null) return false;
    return row.tenantId === user.tenantId;
  }

  /**
   * Detects PostgreSQL unique_violation (23505).
   */
  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object'
      && err !== null
      && 'code' in err
      && (err as { code: string }).code === '23505'
    );
  }
}
