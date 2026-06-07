import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Region } from '../platform/entities/region.entity';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

/**
 * CRUD service for tenant-scoped geographic regions.
 */
@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(Region)
    private readonly repo: Repository<Region>,
  ) {}

  /**
   * Lists all regions for a tenant ordered by name.
   */
  async findAll(tenantId: string): Promise<Region[]> {
    return this.repo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  /**
   * Finds a single region by id and tenant.
   */
  async findOne(id: string, tenantId: string): Promise<Region | null> {
    return this.repo.findOneBy({ id, tenantId });
  }

  /**
   * Creates a region for the tenant.
   */
  async create(tenantId: string, dto: CreateRegionDto): Promise<Region> {
    const row = this.repo.create({
      tenantId,
      code: dto.code.trim(),
      name: dto.name.trim(),
      countryCode: dto.countryCode.trim().toUpperCase(),
    });
    return this.repo.save(row);
  }

  /**
   * Updates a region when it belongs to the tenant.
   */
  async update(id: string, tenantId: string, dto: UpdateRegionDto): Promise<Region | null> {
    const row = await this.repo.findOneBy({ id, tenantId });
    if (!row) return null;

    if (dto.code !== undefined) row.code = dto.code.trim();
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.countryCode !== undefined) row.countryCode = dto.countryCode.trim().toUpperCase();

    return this.repo.save(row);
  }

  /**
   * Deletes a region when it belongs to the tenant.
   */
  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }
}
