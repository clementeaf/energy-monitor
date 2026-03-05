import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from './building.entity';
import { MetersService } from '../meters/meters.service';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    private readonly metersService: MetersService,
  ) {}

  async findAll() {
    const buildings = await this.buildingRepo.find({ relations: ['meters'] });
    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      totalArea: Number(b.totalArea),
      metersCount: b.meters.length,
    }));
  }

  async findOne(id: string) {
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

  async findMeters(buildingId: string) {
    return this.metersService.findByBuilding(buildingId);
  }

  async findConsumption(buildingId: string, resolution: 'hourly' | 'daily' = 'hourly') {
    return this.metersService.findBuildingConsumption(buildingId, resolution);
  }
}
