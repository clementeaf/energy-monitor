import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { RawReading } from './raw-reading.entity';

const MAX_ROWS = 5000;

@Injectable()
export class RawReadingsService {
  constructor(
    @InjectRepository(RawReading)
    private readonly repo: Repository<RawReading>,
  ) {}

  async findByMeter(
    meterId: string,
    from: Date,
    to: Date,
    limit?: number,
  ): Promise<RawReading[]> {
    return this.repo.find({
      where: { meterId, timestamp: Between(from, to) },
      order: { timestamp: 'ASC' },
      take: Math.min(limit ?? MAX_ROWS, MAX_ROWS),
    });
  }
}
