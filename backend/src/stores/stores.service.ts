import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './store.entity';
import { StoreType } from './store-type.entity';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(StoreType)
    private readonly storeTypeRepo: Repository<StoreType>,
  ) {}

  async findAllStores(): Promise<Store[]> {
    return this.storeRepo.find({ order: { meterId: 'ASC' } });
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
