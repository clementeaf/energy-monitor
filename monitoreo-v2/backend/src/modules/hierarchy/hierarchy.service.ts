import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../platform/entities/building.entity';
import { BuildingHierarchy } from '../platform/entities/building-hierarchy.entity';
import { MeterHierarchy } from '../platform/entities/meter-hierarchy.entity';
import { CreateHierarchyNodeDto } from './dto/create-hierarchy-node.dto';
import { UpdateHierarchyNodeDto } from './dto/update-hierarchy-node.dto';

@Injectable()
export class HierarchyService {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    @InjectRepository(BuildingHierarchy)
    private readonly repo: Repository<BuildingHierarchy>,
    @InjectRepository(MeterHierarchy)
    private readonly meterHierarchyRepo: Repository<MeterHierarchy>,
  ) {}

  async findByBuilding(
    tenantId: string,
    buildingId: string,
    buildingIds: string[],
  ): Promise<BuildingHierarchy[]> {
    const qb = this.repo
      .createQueryBuilder('h')
      .where('h.tenant_id = :tenantId', { tenantId })
      .andWhere('h.building_id = :buildingId', { buildingId })
      .orderBy('h.sort_order', 'ASC');

    if (buildingIds.length > 0) {
      qb.andWhere('h.building_id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<BuildingHierarchy | null> {
    const qb = this.repo
      .createQueryBuilder('h')
      .where('h.id = :id', { id })
      .andWhere('h.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('h.building_id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getOne();
  }

  async findMetersByNode(
    hierarchyNodeId: string,
    tenantId: string,
  ): Promise<MeterHierarchy[]> {
    return this.meterHierarchyRepo
      .createQueryBuilder('mh')
      .innerJoinAndSelect('mh.meter', 'meter')
      .innerJoin('mh.hierarchyNode', 'node')
      .where('mh.hierarchy_node_id = :hierarchyNodeId', { hierarchyNodeId })
      .andWhere('node.tenant_id = :tenantId', { tenantId })
      .getMany();
  }

  async create(
    tenantId: string,
    dto: CreateHierarchyNodeDto,
  ): Promise<BuildingHierarchy> {
    // Verify building belongs to this tenant
    const building = await this.buildingRepo.findOneBy({ id: dto.buildingId, tenantId });
    if (!building) throw new BadRequestException('Building does not belong to this tenant');

    const node = this.repo.create({
      tenantId,
      buildingId: dto.buildingId,
      parentId: dto.parentId ?? null,
      name: dto.name,
      levelType: dto.levelType as BuildingHierarchy['levelType'],
      sortOrder: dto.sortOrder ?? 0,
      metadata: dto.metadata ?? {},
    });
    return this.repo.save(node);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateHierarchyNodeDto,
  ): Promise<BuildingHierarchy | null> {
    const node = await this.repo.findOneBy({ id, tenantId });
    if (!node) return null;

    if (dto.name !== undefined) node.name = dto.name;
    if (dto.parentId !== undefined) node.parentId = dto.parentId;
    if (dto.sortOrder !== undefined) node.sortOrder = dto.sortOrder;
    if (dto.metadata !== undefined) node.metadata = dto.metadata;

    return this.repo.save(node);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }
}
