import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meter } from '../platform/entities/meter.entity';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';

@Injectable()
export class MetersService {
  constructor(
    @InjectRepository(Meter)
    private readonly repo: Repository<Meter>,
  ) {}

  async findAll(
    tenantId: string,
    buildingIds: string[],
    filterBuildingId?: string,
    isSuperAdmin = false,
  ): Promise<Meter[]> {
    const qb = this.repo
      .createQueryBuilder('m')
      .orderBy('m.name', 'ASC');

    if (!isSuperAdmin) {
      qb.where('m.tenant_id = :tenantId', { tenantId });
    }

    if (buildingIds.length > 0) {
      qb.andWhere('m.building_id IN (:...buildingIds)', { buildingIds });
    }

    if (filterBuildingId) {
      qb.andWhere('m.building_id = :filterBuildingId', { filterBuildingId });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<Meter | null> {
    const qb = this.repo
      .createQueryBuilder('m')
      .where('m.id = :id', { id })
      .andWhere('m.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('m.building_id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getOne();
  }

  async create(tenantId: string, dto: CreateMeterDto): Promise<Meter> {
    const meter = this.repo.create({
      tenantId,
      buildingId: dto.buildingId,
      name: dto.name,
      code: dto.code,
      meterType: dto.meterType ?? 'electrical',
      isActive: dto.isActive ?? true,
      metadata: dto.metadata ?? {},
      externalId: dto.externalId ?? null,
      model: dto.model ?? null,
      serialNumber: dto.serialNumber ?? null,
      ipAddress: dto.ipAddress ?? null,
      modbusAddress: dto.modbusAddress ?? null,
      busId: dto.busId ?? null,
      phaseType: dto.phaseType ?? 'three_phase',
      uplinkRoute: dto.uplinkRoute ?? null,
      nominalVoltage: dto.nominalVoltage != null ? String(dto.nominalVoltage) : null,
      nominalCurrent: dto.nominalCurrent != null ? String(dto.nominalCurrent) : null,
      contractedDemandKw: dto.contractedDemandKw != null ? String(dto.contractedDemandKw) : null,
    });
    return this.repo.save(meter);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateMeterDto,
  ): Promise<Meter | null> {
    const meter = await this.repo.findOneBy({ id, tenantId });
    if (!meter) return null;

    if (dto.name !== undefined) meter.name = dto.name;
    if (dto.meterType !== undefined) meter.meterType = dto.meterType;
    if (dto.isActive !== undefined) meter.isActive = dto.isActive;
    if (dto.metadata !== undefined) meter.metadata = dto.metadata;
    if (dto.externalId !== undefined) meter.externalId = dto.externalId ?? null;
    if (dto.model !== undefined) meter.model = dto.model ?? null;
    if (dto.serialNumber !== undefined) meter.serialNumber = dto.serialNumber ?? null;
    if (dto.ipAddress !== undefined) meter.ipAddress = dto.ipAddress ?? null;
    if (dto.modbusAddress !== undefined) meter.modbusAddress = dto.modbusAddress ?? null;
    if (dto.busId !== undefined) meter.busId = dto.busId ?? null;
    if (dto.phaseType !== undefined) meter.phaseType = dto.phaseType;
    if (dto.uplinkRoute !== undefined) meter.uplinkRoute = dto.uplinkRoute ?? null;
    if (dto.nominalVoltage !== undefined) {
      meter.nominalVoltage = dto.nominalVoltage != null ? String(dto.nominalVoltage) : null;
    }
    if (dto.nominalCurrent !== undefined) {
      meter.nominalCurrent = dto.nominalCurrent != null ? String(dto.nominalCurrent) : null;
    }
    if (dto.contractedDemandKw !== undefined) {
      meter.contractedDemandKw = dto.contractedDemandKw != null ? String(dto.contractedDemandKw) : null;
    }

    return this.repo.save(meter);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }
}
