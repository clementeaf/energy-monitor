import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNotFoundResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { BuildingSummaryDto, ConsumptionPointDto } from './dto/building-response.dto';
import { Meter } from '../meters/meter.entity';

@ApiTags('Buildings')
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar edificios', description: 'Retorna todos los edificios con la cantidad de medidores.' })
  @ApiOkResponse({ type: [BuildingSummaryDto] })
  findAll() {
    return this.buildingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener edificio por ID' })
  @ApiParam({ name: 'id', example: 'pac4220' })
  @ApiOkResponse({ type: BuildingSummaryDto })
  @ApiNotFoundResponse({ description: 'Edificio no encontrado' })
  async findOne(@Param('id') id: string) {
    const building = await this.buildingsService.findOne(id);
    if (!building) throw new NotFoundException();
    return building;
  }

  @Get(':id/meters')
  @ApiOperation({ summary: 'Listar medidores de un edificio' })
  @ApiParam({ name: 'id', example: 'pac4220' })
  @ApiOkResponse({ type: [Meter] })
  findMeters(@Param('id') id: string) {
    return this.buildingsService.findMeters(id);
  }

  @Get(':id/consumption')
  @ApiOperation({ summary: 'Consumo agregado de un edificio', description: 'Retorna serie temporal con potencia total, promedio y pico por intervalo.' })
  @ApiParam({ name: 'id', example: 'pac4220' })
  @ApiQuery({ name: 'resolution', required: false, enum: ['hourly', 'daily'], description: 'Resolución temporal (default: hourly)' })
  @ApiOkResponse({ type: [ConsumptionPointDto] })
  findConsumption(
    @Param('id') id: string,
    @Query('resolution') resolution?: 'hourly' | 'daily',
  ) {
    return this.buildingsService.findConsumption(id, resolution ?? 'hourly');
  }
}
