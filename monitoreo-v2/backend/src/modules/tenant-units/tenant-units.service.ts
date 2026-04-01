import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantUnit } from '../platform/entities/tenant-unit.entity';
import { TenantUnitMeter } from '../platform/entities/tenant-unit-meter.entity';
import { CreateTenantUnitDto } from './dto/create-tenant-unit.dto';
import { UpdateTenantUnitDto } from './dto/update-tenant-unit.dto';

@Injectable()
export class TenantUnitsService {
  constructor(
    @InjectRepository(TenantUnit)
    private readonly repo: Repository<TenantUnit>,
    @InjectRepository(TenantUnitMeter)
    private readonly meterRepo: Repository<TenantUnitMeter>,
  ) {}

  async findAll(
    tenantId: string,
    buildingIds: string[],
    buildingId?: string,
  ): Promise<TenantUnit[]> {
    const qb = this.repo
      .createQueryBuilder('tu')
      .where('tu.tenant_id = :tenantId', { tenantId })
      .orderBy('tu.name', 'ASC');

    if (buildingIds.length > 0) {
      qb.andWhere('tu.building_id IN (:...buildingIds)', { buildingIds });
    }

    if (buildingId) {
      qb.andWhere('tu.building_id = :buildingId', { buildingId });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<TenantUnit | null> {
    const qb = this.repo
      .createQueryBuilder('tu')
      .where('tu.id = :id', { id })
      .andWhere('tu.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('tu.building_id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getOne();
  }

  async create(tenantId: string, dto: CreateTenantUnitDto): Promise<TenantUnit> {
    const unit = this.repo.create({
      tenantId,
      buildingId: dto.buildingId,
      name: dto.name,
      unitCode: dto.unitCode,
      contactName: dto.contactName ?? null,
      contactEmail: dto.contactEmail ?? null,
      userId: dto.userId ?? null,
    });
    return this.repo.save(unit);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateTenantUnitDto,
  ): Promise<TenantUnit | null> {
    const unit = await this.repo.findOneBy({ id, tenantId });
    if (!unit) return null;

    if (dto.name !== undefined) unit.name = dto.name;
    if (dto.unitCode !== undefined) unit.unitCode = dto.unitCode;
    if (dto.contactName !== undefined) unit.contactName = dto.contactName ?? null;
    if (dto.contactEmail !== undefined) unit.contactEmail = dto.contactEmail ?? null;
    if (dto.userId !== undefined) unit.userId = dto.userId ?? null;
    if (dto.isActive !== undefined) unit.isActive = dto.isActive;

    return this.repo.save(unit);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async findMeters(tenantUnitId: string, tenantId: string): Promise<TenantUnitMeter[]> {
    const unit = await this.repo.findOneBy({ id: tenantUnitId, tenantId });
    if (!unit) return [];

    return this.meterRepo.findBy({ tenantUnitId });
  }

  async addMeter(
    tenantUnitId: string,
    meterId: string,
    tenantId: string,
  ): Promise<TenantUnitMeter | null> {
    const unit = await this.repo.findOneBy({ id: tenantUnitId, tenantId });
    if (!unit) return null;

    const entry = this.meterRepo.create({
      tenantUnitId,
      meterId,
    });
    return this.meterRepo.save(entry);
  }

  async removeMeter(
    tenantUnitId: string,
    meterId: string,
    tenantId: string,
  ): Promise<boolean> {
    const unit = await this.repo.findOneBy({ id: tenantUnitId, tenantId });
    if (!unit) return false;

    const result = await this.meterRepo.delete({ tenantUnitId, meterId });
    return (result.affected ?? 0) > 0;
  }
}
