import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Store } from './store.entity';
import { StoreType } from './store-type.entity';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(StoreType)
    private readonly storeTypeRepo: Repository<StoreType>,
    private readonly dataSource: DataSource,
  ) {}

  async findAllStores(): Promise<(Store & { buildingName: string | null })[]> {
    const rows = await this.dataSource.query(`
      SELECT s.meter_id, s.store_name, s.store_type_id,
             st.id AS st_id, st.name AS st_name,
             b.building_name
      FROM store s
      LEFT JOIN store_type st ON st.id = s.store_type_id
      LEFT JOIN LATERAL (
        SELECT DISTINCT building_name
        FROM meter_monthly_billing mmb
        WHERE mmb.meter_id = s.meter_id
        LIMIT 1
      ) b ON true
      ORDER BY s.meter_id ASC
    `);
    return rows.map((r: Record<string, unknown>) => ({
      meterId: r.meter_id as string,
      storeName: r.store_name as string,
      storeTypeId: r.store_type_id as number,
      storeType: { id: r.st_id as number, name: r.st_name as string },
      buildingName: (r.building_name as string) ?? null,
    }));
  }

  async findStoreByMeterId(meterId: string): Promise<Store | null> {
    return this.storeRepo.findOne({ where: { meterId } });
  }

  async findAllStoreTypes(): Promise<StoreType[]> {
    return this.storeTypeRepo.find({ order: { name: 'ASC' } });
  }

  async findStoresByType(storeTypeId: number): Promise<Store[]> {
    return this.storeRepo.find({
      where: { storeTypeId },
      order: { meterId: 'ASC' },
    });
  }
}
