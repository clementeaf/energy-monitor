import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Local } from './local.entity';
import { MonthlyConsumption } from './monthly-consumption.entity';

@Injectable()
export class LocalsService {
  constructor(
    @InjectRepository(Local)
    private readonly localRepo: Repository<Local>,
    @InjectRepository(MonthlyConsumption)
    private readonly consumptionRepo: Repository<MonthlyConsumption>,
  ) {}

  async findOne(id: string) {
    const l = await this.localRepo.findOne({ where: { id } });
    if (!l) return null;
    return {
      id: l.id,
      buildingId: l.buildingId,
      name: l.name,
      floor: l.floor,
      area: Number(l.area),
      type: l.type,
    };
  }

  async findConsumption(localId: string) {
    const rows = await this.consumptionRepo.find({
      where: { localId },
      order: {
        id: 'ASC',
      },
    });
    return rows.map((r) => ({
      month: r.month,
      consumption: Number(r.consumption),
      unit: r.unit,
    }));
  }
}
