import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingSummary } from './building-summary.entity';

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
}
