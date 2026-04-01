import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tariff } from '../platform/entities/tariff.entity';
import { TariffBlock } from '../platform/entities/tariff-block.entity';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { CreateTariffBlockDto } from './dto/create-tariff-block.dto';

@Injectable()
export class TariffsService {
  constructor(
    @InjectRepository(Tariff)
    private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(TariffBlock)
    private readonly blockRepo: Repository<TariffBlock>,
  ) {}

  async findAll(
    tenantId: string,
    buildingIds: string[],
    buildingId?: string,
  ): Promise<Tariff[]> {
    const qb = this.tariffRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .orderBy('t.effective_from', 'DESC');

    if (buildingIds.length > 0) {
      qb.andWhere('t.building_id IN (:...buildingIds)', { buildingIds });
    }

    if (buildingId) {
      qb.andWhere('t.building_id = :buildingId', { buildingId });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<Tariff | null> {
    const qb = this.tariffRepo
      .createQueryBuilder('t')
      .where('t.id = :id', { id })
      .andWhere('t.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('t.building_id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getOne();
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateTariffDto,
  ): Promise<Tariff> {
    const tariff = this.tariffRepo.create({
      tenantId,
      buildingId: dto.buildingId,
      name: dto.name,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo ?? null,
      isActive: dto.isActive ?? true,
      createdBy: userId,
    });
    return this.tariffRepo.save(tariff);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateTariffDto,
  ): Promise<Tariff | null> {
    const tariff = await this.tariffRepo.findOneBy({ id, tenantId });
    if (!tariff) return null;

    if (dto.name !== undefined) tariff.name = dto.name;
    if (dto.effectiveFrom !== undefined) tariff.effectiveFrom = dto.effectiveFrom;
    if (dto.effectiveTo !== undefined) tariff.effectiveTo = dto.effectiveTo ?? null;
    if (dto.isActive !== undefined) tariff.isActive = dto.isActive;

    return this.tariffRepo.save(tariff);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.tariffRepo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async findBlocks(tariffId: string, tenantId: string): Promise<TariffBlock[]> {
    const tariff = await this.tariffRepo.findOneBy({ id: tariffId, tenantId });
    if (!tariff) return [];

    return this.blockRepo.find({ where: { tariffId } });
  }

  async createBlock(
    tariffId: string,
    tenantId: string,
    dto: CreateTariffBlockDto,
  ): Promise<TariffBlock | null> {
    const tariff = await this.tariffRepo.findOneBy({ id: tariffId, tenantId });
    if (!tariff) return null;

    const block = this.blockRepo.create({
      tariffId,
      blockName: dto.blockName,
      hourStart: dto.hourStart,
      hourEnd: dto.hourEnd,
      energyRate: String(dto.energyRate),
      demandRate: String(dto.demandRate ?? 0),
      reactiveRate: String(dto.reactiveRate ?? 0),
      fixedCharge: String(dto.fixedCharge ?? 0),
    });
    return this.blockRepo.save(block);
  }

  async removeBlock(blockId: string, tenantId: string): Promise<boolean> {
    const block = await this.blockRepo
      .createQueryBuilder('b')
      .innerJoin('b.tariff', 't')
      .where('b.id = :blockId', { blockId })
      .andWhere('t.tenant_id = :tenantId', { tenantId })
      .getOne();

    if (!block) return false;

    const result = await this.blockRepo.delete({ id: blockId });
    return (result.affected ?? 0) > 0;
  }
}
