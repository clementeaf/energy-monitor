import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { ComparisonsService } from './comparisons.service';

@Public()
@ApiTags('Comparisons')
@Controller('comparisons')
export class ComparisonsController {
  constructor(private readonly comparisonsService: ComparisonsService) {}

  @Get('filters')
  @ApiOperation({ summary: 'Tipos de tienda y meses disponibles para comparativas' })
  @ApiOkResponse({ description: 'Filtros disponibles' })
  async getFilters() {
    return this.comparisonsService.getFilters();
  }

  @Get('by-store-name')
  @ApiOperation({ summary: 'Comparativa de tiendas (por nombre) entre edificios para un mes' })
  @ApiOkResponse({ description: 'Filas de comparación por edificio' })
  @ApiQuery({ name: 'storeNames', required: true, type: String, description: 'Comma-separated store names' })
  @ApiQuery({ name: 'month', required: true, type: String, example: '2025-06-01' })
  async getByStoreName(
    @Query('storeNames') storeNames: string,
    @Query('month') month: string,
  ) {
    const names = storeNames.split(',').map((s) => s.trim()).filter(Boolean);
    return this.comparisonsService.getByStoreName(names, month);
  }

  @Get('by-store-type')
  @ApiOperation({ summary: 'Comparativa de tipos de tienda entre edificios para un mes' })
  @ApiOkResponse({ description: 'Filas de comparación por edificio' })
  @ApiQuery({ name: 'storeTypeIds', required: true, type: String, description: 'Comma-separated store type IDs' })
  @ApiQuery({ name: 'month', required: true, type: String, example: '2025-06-01' })
  async getByStoreType(
    @Query('storeTypeIds') storeTypeIds: string,
    @Query('month') month: string,
  ) {
    const ids = storeTypeIds.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n));
    return this.comparisonsService.getByStoreType(ids, month);
  }
}
