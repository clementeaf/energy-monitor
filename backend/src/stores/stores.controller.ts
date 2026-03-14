import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { StoresService } from './stores.service';

@Public()
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  async findAll() {
    return this.storesService.findAllStores();
  }

  @Get('types')
  async findAllTypes() {
    return this.storesService.findAllStoreTypes();
  }

  @Get('types/:id')
  async findByType(@Param('id') id: string) {
    const stores = await this.storesService.findStoresByType(+id);
    if (!stores.length) {
      throw new NotFoundException(`No stores found for type ${id}`);
    }
    return stores;
  }

  @Get(':meterId')
  async findByMeterId(@Param('meterId') meterId: string) {
    const store = await this.storesService.findStoreByMeterId(meterId);
    if (!store) {
      throw new NotFoundException(`Store with meter "${meterId}" not found`);
    }
    return store;
  }
}
