import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Store } from './store.entity';
import { StoreType } from './store-type.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

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

  // --- Operators ---

  async findOperatorsByBuilding(buildingName: string) {
    const rows = await this.dataSource.query(`
      SELECT s.store_name, COUNT(*)::int AS meter_count
      FROM store s
      INNER JOIN meter_monthly_billing mmb ON mmb.meter_id = s.meter_id
      WHERE mmb.building_name = $1
      GROUP BY s.store_name
      ORDER BY s.store_name ASC
    `, [buildingName]);
    return rows.map((r: Record<string, unknown>) => ({
      storeName: r.store_name as string,
      meterCount: r.meter_count as number,
    }));
  }

  async renameOperator(buildingName: string, operatorName: string, newName: string): Promise<void> {
    // Rename store_name for all meters of this operator in this building
    await this.dataSource.query(`
      UPDATE store SET store_name = $1
      WHERE meter_id IN (
        SELECT s.meter_id FROM store s
        INNER JOIN meter_monthly_billing mmb ON mmb.meter_id = s.meter_id
        WHERE mmb.building_name = $2 AND s.store_name = $3
      )
    `, [newName, buildingName, operatorName]);
  }

  async removeOperator(buildingName: string, operatorName: string): Promise<void> {
    // Set store_name to 'Sin información' for all meters of this operator in this building
    await this.dataSource.query(`
      UPDATE store SET store_name = 'Sin información'
      WHERE meter_id IN (
        SELECT s.meter_id FROM store s
        INNER JOIN meter_monthly_billing mmb ON mmb.meter_id = s.meter_id
        WHERE mmb.building_name = $1 AND s.store_name = $2
      )
    `, [buildingName, operatorName]);
  }

  // --- Store CRUD ---

  async createStore(dto: CreateStoreDto): Promise<Store> {
    // Insert store
    const store = this.storeRepo.create({
      meterId: dto.meterId,
      storeName: dto.storeName,
      storeTypeId: dto.storeTypeId,
    });
    await this.storeRepo.save(store);

    // Link to building via meter_monthly_billing (one row for current month)
    const month = new Date().toISOString().slice(0, 7) + '-01';
    await this.dataSource.query(`
      INSERT INTO meter_monthly_billing (meter_id, month, building_name)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [dto.meterId, month, dto.buildingName]);

    return store;
  }

  async updateStore(meterId: string, dto: UpdateStoreDto): Promise<void> {
    const updates: Partial<Store> = {};
    if (dto.storeName !== undefined) updates.storeName = dto.storeName;
    if (dto.storeTypeId !== undefined) updates.storeTypeId = dto.storeTypeId;
    if (Object.keys(updates).length > 0) {
      await this.storeRepo.update({ meterId }, updates);
    }
  }

  async removeStore(meterId: string): Promise<void> {
    await this.dataSource.query(`DELETE FROM meter_monthly_billing WHERE meter_id = $1`, [meterId]);
    await this.storeRepo.delete({ meterId });
  }
}
