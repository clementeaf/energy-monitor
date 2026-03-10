import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Building } from './building.entity';
import { MetersService } from '../meters/meters.service';
import { getScopedSiteIds, hasSiteAccess, type AccessScope } from '../auth/access-scope';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    private readonly metersService: MetersService,
  ) {}

  async findAll(scope: AccessScope) {
    const scopedSiteIds = getScopedSiteIds(scope);
    const buildings = await this.buildingRepo.find({
      where: scopedSiteIds ? { id: In(scopedSiteIds) } : {},
      relations: ['meters'],
    });
    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      totalArea: Number(b.totalArea),
      metersCount: b.meters.length,
    }));
  }

  async findOne(id: string, scope: AccessScope) {
    if (!hasSiteAccess(scope, id)) return null;

    const b = await this.buildingRepo.findOne({ where: { id }, relations: ['meters'] });
    if (!b) return null;
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      totalArea: Number(b.totalArea),
      metersCount: b.meters.length,
    };
  }

  async findMeters(buildingId: string, scope: AccessScope) {
    if (!hasSiteAccess(scope, buildingId)) return null;

    return this.metersService.findByBuilding(buildingId, scope);
  }

  async findConsumption(
    buildingId: string,
    scope: AccessScope,
    resolution: '15min' | 'hourly' | 'daily' = 'hourly',
    from?: string,
    to?: string,
  ) {
    if (!hasSiteAccess(scope, buildingId)) return null;

    return this.metersService.findBuildingConsumption(buildingId, scope, resolution, from, to);
  }
}
