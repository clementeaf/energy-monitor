import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Concentrator } from '../platform/entities/concentrator.entity';
import { ConcentratorMeter } from '../platform/entities/concentrator-meter.entity';
import { CreateConcentratorDto } from './dto/create-concentrator.dto';
import { UpdateConcentratorDto } from './dto/update-concentrator.dto';
import { AddConcentratorMeterDto } from './dto/add-concentrator-meter.dto';

@Injectable()
export class ConcentratorsService {
  constructor(
    @InjectRepository(Concentrator)
    private readonly repo: Repository<Concentrator>,
    @InjectRepository(ConcentratorMeter)
    private readonly meterRepo: Repository<ConcentratorMeter>,
  ) {}

  async findAll(
    tenantId: string,
    buildingIds: string[],
    buildingId?: string,
  ): Promise<Concentrator[]> {
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .orderBy('c.name', 'ASC');

    if (buildingIds.length > 0) {
      qb.andWhere('c.building_id IN (:...buildingIds)', { buildingIds });
    }

    if (buildingId) {
      qb.andWhere('c.building_id = :buildingId', { buildingId });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<Concentrator | null> {
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.id = :id', { id })
      .andWhere('c.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('c.building_id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getOne();
  }

  async create(tenantId: string, dto: CreateConcentratorDto): Promise<Concentrator> {
    const concentrator = this.repo.create({
      tenantId,
      buildingId: dto.buildingId,
      name: dto.name,
      model: dto.model,
      serialNumber: dto.serialNumber ?? null,
      ipAddress: dto.ipAddress ?? null,
      firmwareVersion: dto.firmwareVersion ?? null,
      status: (dto.status as Concentrator['status']) ?? 'online',
      metadata: dto.metadata ?? {},
    });
    return this.repo.save(concentrator);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateConcentratorDto,
  ): Promise<Concentrator | null> {
    const concentrator = await this.repo.findOneBy({ id, tenantId });
    if (!concentrator) return null;

    if (dto.name !== undefined) concentrator.name = dto.name;
    if (dto.model !== undefined) concentrator.model = dto.model;
    if (dto.serialNumber !== undefined) concentrator.serialNumber = dto.serialNumber ?? null;
    if (dto.ipAddress !== undefined) concentrator.ipAddress = dto.ipAddress ?? null;
    if (dto.firmwareVersion !== undefined) concentrator.firmwareVersion = dto.firmwareVersion ?? null;
    if (dto.status !== undefined) concentrator.status = dto.status as Concentrator['status'];
    if (dto.mqttConnected !== undefined) concentrator.mqttConnected = dto.mqttConnected;
    if (dto.batteryLevel !== undefined) concentrator.batteryLevel = dto.batteryLevel ?? null;
    if (dto.metadata !== undefined) concentrator.metadata = dto.metadata ?? {};

    return this.repo.save(concentrator);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async findMeters(concentratorId: string, tenantId: string): Promise<ConcentratorMeter[]> {
    const concentrator = await this.repo.findOneBy({ id: concentratorId, tenantId });
    if (!concentrator) return [];

    return this.meterRepo.findBy({ concentratorId });
  }

  async addMeter(
    concentratorId: string,
    dto: AddConcentratorMeterDto,
    tenantId: string,
  ): Promise<ConcentratorMeter | null> {
    const concentrator = await this.repo.findOneBy({ id: concentratorId, tenantId });
    if (!concentrator) return null;

    const entry = this.meterRepo.create({
      concentratorId,
      meterId: dto.meterId,
      busNumber: dto.busNumber ?? 1,
      modbusAddress: dto.modbusAddress ?? null,
    });
    return this.meterRepo.save(entry);
  }

  async removeMeter(
    concentratorId: string,
    meterId: string,
    tenantId: string,
  ): Promise<boolean> {
    const concentrator = await this.repo.findOneBy({ id: concentratorId, tenantId });
    if (!concentrator) return false;

    const result = await this.meterRepo.delete({ concentratorId, meterId });
    return (result.affected ?? 0) > 0;
  }
}
