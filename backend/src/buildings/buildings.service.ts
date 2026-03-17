import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingSummary } from './building-summary.entity';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(BuildingSummary)
    private readonly repo: Repository<BuildingSummary>,
  ) {}

  async findAll(): Promise<BuildingSummary[]> {
    return this.repo.find({ order: { buildingName: 'ASC', month: 'DESC' } });
  }

  async findByName(buildingName: string): Promise<BuildingSummary[]> {
    return this.repo.find({
      where: { buildingName },
      order: { month: 'DESC' },
    });
  }

  async create(dto: CreateBuildingDto): Promise<BuildingSummary> {
    const month = new Date().toISOString().slice(0, 7) + '-01';
    const row = this.repo.create({
      buildingName: dto.buildingName,
      month,
      areaSqm: dto.areaSqm,
      totalStores: 0,
      storeTypes: 0,
      totalMeters: 0,
      assignedMeters: 0,
      unassignedMeters: 0,
      totalKwh: null,
      totalPowerKw: null,
      avgPowerKw: null,
      peakPowerKw: null,
      totalReactiveKvar: null,
      avgPowerFactor: null,
      peakDemandKw: null,
    });
    return this.repo.save(row);
  }

  async update(buildingName: string, dto: UpdateBuildingDto): Promise<void> {
    if (dto.areaSqm !== undefined) {
      await this.repo.update({ buildingName }, { areaSqm: dto.areaSqm });
    }
  }

  async remove(buildingName: string): Promise<void> {
    await this.repo.delete({ buildingName });
  }
}
