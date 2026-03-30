import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../platform/entities/building.entity';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private readonly repo: Repository<Building>,
  ) {}

  async findAll(tenantId: string, buildingIds: string[]): Promise<Building[]> {
    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .orderBy('b.name', 'ASC');

    if (buildingIds.length > 0) {
      qb.andWhere('b.id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<Building | null> {
    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.id = :id', { id })
      .andWhere('b.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('b.id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getOne();
  }

  async create(tenantId: string, dto: CreateBuildingDto): Promise<Building> {
    const building = this.repo.create({
      tenantId,
      name: dto.name,
      code: dto.code,
      address: dto.address ?? null,
      areaSqm: dto.areaSqm != null ? String(dto.areaSqm) : null,
    });
    return this.repo.save(building);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateBuildingDto,
  ): Promise<Building | null> {
    const building = await this.repo.findOneBy({ id, tenantId });
    if (!building) return null;

    if (dto.name !== undefined) building.name = dto.name;
    if (dto.address !== undefined) building.address = dto.address;
    if (dto.areaSqm !== undefined) building.areaSqm = String(dto.areaSqm);
    if (dto.isActive !== undefined) building.isActive = dto.isActive;

    return this.repo.save(building);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }
}
