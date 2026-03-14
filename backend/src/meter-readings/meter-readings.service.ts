import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MeterReading } from './meter-reading.entity';

const MAX_ROWS = 5000;

@Injectable()
export class MeterReadingsService {
  constructor(
    @InjectRepository(MeterReading)
    private readonly repo: Repository<MeterReading>,
  ) {}

  async findByMeter(
    meterId: string,
    from: Date,
    to: Date,
    limit?: number,
  ): Promise<MeterReading[]> {
    return this.repo.find({
      where: { meterId, timestamp: Between(from, to) },
      order: { timestamp: 'ASC' },
      take: Math.min(limit ?? MAX_ROWS, MAX_ROWS),
    });
  }
}
