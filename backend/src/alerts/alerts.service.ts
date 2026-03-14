import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Alert } from './alert.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly repo: Repository<Alert>,
  ) {}

  async findAll(filters?: { severity?: string; meterId?: string }): Promise<Alert[]> {
    const where: FindOptionsWhere<Alert> = {};
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.meterId) where.meterId = filters.meterId;

    return this.repo.find({
      where,
      order: { timestamp: 'DESC' },
      take: 500,
    });
  }
}
