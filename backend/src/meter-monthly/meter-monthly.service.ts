import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeterMonthly } from './meter-monthly.entity';

@Injectable()
export class MeterMonthlyService {
  constructor(
    @InjectRepository(MeterMonthly)
    private readonly repo: Repository<MeterMonthly>,
  ) {}

  async findAll(): Promise<MeterMonthly[]> {
    return this.repo.find({ order: { meterId: 'ASC', month: 'DESC' } });
  }

  async findByMeterId(meterId: string): Promise<MeterMonthly[]> {
    return this.repo.find({
      where: { meterId },
      order: { month: 'DESC' },
    });
  }
}
