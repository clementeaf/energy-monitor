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

  @Get(':id/uptime')
  @ApiOperation({ summary: 'Obtener resumen de uptime del medidor' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly', 'all'], description: 'Período (default: all)' })
  async getUptime(
    @Param('id') id: string,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly' | 'all',
  ) {
    if (!period || period === 'all') return this.metersService.getUptimeAll(id);
    return this.metersService.getUptimeSummary(id, period);
  }

  @Get(':id/downtime-events')
  @ApiOperation({ summary: 'Obtener eventos de downtime del medidor' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'from', required: true, description: 'Inicio (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: true, description: 'Fin (ISO 8601)', example: '2026-03-06T23:59:59Z' })
  getDowntimeEvents(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.metersService.getDowntimeEvents(id, from, to);
  }

  @Get(':id/alarm-events')
  @ApiOperation({ summary: 'Obtener eventos de alarma del medidor' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'from', required: true, description: 'Inicio (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: true, description: 'Fin (ISO 8601)', example: '2026-03-06T23:59:59Z' })
  getAlarmEvents(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.metersService.getAlarmEvents(id, from, to);
  }

  @Get(':id/alarm-summary')
  @ApiOperation({ summary: 'Obtener resumen de alarmas del medidor' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'from', required: true, description: 'Inicio (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: true, description: 'Fin (ISO 8601)', example: '2026-03-06T23:59:59Z' })
  getAlarmSummary(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.metersService.getAlarmSummary(id, from, to);
  }

  @Get(':id/readings')
  @ApiOperation({ summary: 'Obtener lecturas de un medidor', description: 'Retorna lecturas crudas o agregadas (promedio) por hora/día.' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'resolution', required: false, enum: ['raw', '15min', 'hourly', 'daily'], description: 'Resolución temporal (default: hourly)' })
  @ApiQuery({ name: 'from', required: false, description: 'Inicio del rango (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, description: 'Fin del rango (ISO 8601)', example: '2026-03-06T23:59:59Z' })
  @ApiOkResponse({ type: [Reading] })
  findReadings(
    @Param('id') id: string,
    @Query('resolution') resolution?: 'raw' | '15min' | 'hourly' | 'daily',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.metersService.findReadings(id, resolution ?? 'hourly', from, to);
  }
}
