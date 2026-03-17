import { Controller, Get, Post, Patch, Delete, Param, Body, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';

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

  // --- Operators (must be before :meterId) ---

  @Get('operators/:buildingName')
  async findOperators(@Param('buildingName') buildingName: string) {
    return this.storesService.findOperatorsByBuilding(buildingName);
  }

  @Patch('operators/:buildingName/:operatorName')
  async renameOperator(
    @Param('buildingName') buildingName: string,
    @Param('operatorName') operatorName: string,
    @Body() dto: UpdateOperatorDto,
  ) {
    await this.storesService.renameOperator(buildingName, operatorName, dto.newName);
    return { success: true };
  }

  @Delete('operators/:buildingName/:operatorName')
  async removeOperator(
    @Param('buildingName') buildingName: string,
    @Param('operatorName') operatorName: string,
  ) {
    await this.storesService.removeOperator(buildingName, operatorName);
    return { success: true };
  }

  // --- Store CRUD ---

  @Post()
  async createStore(@Body() dto: CreateStoreDto) {
    return this.storesService.createStore(dto);
  }

  @Patch(':meterId')
  async updateStore(@Param('meterId') meterId: string, @Body() dto: UpdateStoreDto) {
    const store = await this.storesService.findStoreByMeterId(meterId);
    if (!store) {
      throw new NotFoundException(`Store with meter "${meterId}" not found`);
    }
    await this.storesService.updateStore(meterId, dto);
    return { success: true };
  }

  @Delete(':meterId')
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
