import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNotFoundResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MetersService } from './meters.service';
import { Meter } from './meter.entity';
import { Reading } from './reading.entity';

@ApiTags('Meters')
@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Obtener medidor por ID' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiOkResponse({ type: Meter })
  @ApiNotFoundResponse({ description: 'Medidor no encontrado' })
  async findOne(@Param('id') id: string) {
    const meter = await this.metersService.findOne(id);
    if (!meter) throw new NotFoundException();
    return meter;
  }

  @Get(':id/readings')
  @ApiOperation({ summary: 'Obtener lecturas de un medidor', description: 'Retorna lecturas crudas o agregadas (promedio) por hora/día.' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'resolution', required: false, enum: ['raw', 'hourly', 'daily'], description: 'Resolución temporal (default: hourly)' })
  @ApiOkResponse({ type: [Reading] })
  findReadings(
    @Param('id') id: string,
    @Query('resolution') resolution?: 'raw' | 'hourly' | 'daily',
  ) {
    return this.metersService.findReadings(id, resolution ?? 'hourly');
  }
}
