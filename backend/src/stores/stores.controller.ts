import { Controller, Get, Post, Patch, Delete, Param, Body, NotFoundException } from '@nestjs/common';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { BulkCreateStoresDto } from './dto/bulk-create-stores.dto';

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

  // --- Operators (must be before :meterId) ---

  @Get('operators/:buildingName')
  async findOperators(@Param('buildingName') buildingName: string) {
    return this.storesService.findOperatorsByBuilding(buildingName);
  }

  @Patch('operators/:buildingName/:operatorName')
  @RequirePermissions('ADMIN_SITES', 'manage')
  async renameOperator(
    @Param('buildingName') buildingName: string,
    @Param('operatorName') operatorName: string,
    @Body() dto: UpdateOperatorDto,
  ) {
    await this.storesService.renameOperator(buildingName, operatorName, dto.newName);
    return { success: true };
  }

  @Delete('operators/:buildingName/:operatorName')
  @RequirePermissions('ADMIN_SITES', 'manage')
  async removeOperator(
    @Param('buildingName') buildingName: string,
    @Param('operatorName') operatorName: string,
  ) {
    await this.storesService.removeOperator(buildingName, operatorName);
    return { success: true };
  }

  // --- Store CRUD ---

  @Post('bulk')
  @RequirePermissions('ADMIN_METERS', 'manage')
  async bulkCreateStores(@Body() dto: BulkCreateStoresDto) {
    return this.storesService.bulkCreateStores(dto.items);
  }

  @Post()
  @RequirePermissions('ADMIN_METERS', 'manage')
  async createStore(@Body() dto: CreateStoreDto) {
    return this.storesService.createStore(dto);
  }

  @Patch(':meterId')
  @RequirePermissions('ADMIN_METERS', 'manage')
  async updateStore(@Param('meterId') meterId: string, @Body() dto: UpdateStoreDto) {
    const store = await this.storesService.findStoreByMeterId(meterId);
    if (!store) {
      throw new NotFoundException(`Store with meter "${meterId}" not found`);
    }
    await this.storesService.updateStore(meterId, dto);
    return { success: true };
  }

  @Delete(':meterId')
  @RequirePermissions('ADMIN_METERS', 'manage')
  async removeStore(@Param('meterId') meterId: string) {
    const store = await this.storesService.findStoreByMeterId(meterId);
    if (!store) {
      throw new NotFoundException(`Store with meter "${meterId}" not found`);
    }
    await this.storesService.removeStore(meterId);
    return { success: true };
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
