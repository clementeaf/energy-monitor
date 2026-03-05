import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from './building.entity';
import { Local } from '../locals/local.entity';
import { MonthlyConsumption } from '../locals/monthly-consumption.entity';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    @InjectRepository(Local)
    private readonly localRepo: Repository<Local>,
    @InjectRepository(MonthlyConsumption)
    private readonly consumptionRepo: Repository<MonthlyConsumption>,
  ) {}

  async findAll() {
    const buildings = await this.buildingRepo.find({ relations: ['locals'] });
    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      totalArea: Number(b.totalArea),
      localsCount: b.locals.length,
    }));
  }

  async findOne(id: string) {
    const b = await this.buildingRepo.findOne({ where: { id }, relations: ['locals'] });
    if (!b) return null;
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      totalArea: Number(b.totalArea),
      localsCount: b.locals.length,
    };
  }

  async findLocals(buildingId: string) {
    const locals = await this.localRepo.find({ where: { buildingId } });
    return locals.map((l) => ({
      id: l.id,
      buildingId: l.buildingId,
      name: l.name,
      floor: l.floor,
      area: Number(l.area),
      type: l.type,
    }));
  }

  async findConsumption(buildingId: string) {
    const rows = await this.consumptionRepo
      .createQueryBuilder('mc')
      .select('mc.month', 'month')
      .addSelect('SUM(mc.consumption)', 'consumption')
      .innerJoin('mc.local', 'l')
      .where('l.building_id = :buildingId', { buildingId })
      .groupBy('mc.month')
      .orderBy("ARRAY_POSITION(ARRAY['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'], mc.month)")
      .getRawMany<{ month: string; consumption: string }>();

    return rows.map((r) => ({
      month: r.month,
      consumption: Number(r.consumption),
      unit: 'kWh',
    }));
  }
}
