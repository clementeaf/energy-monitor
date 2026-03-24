import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { enforceRange } from '../common/range-guard';
import { IotReadingsService } from './iot-readings.service';

@Controller('iot-readings')
export class IotReadingsController {
  constructor(private readonly service: IotReadingsService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Última lectura IoT del dispositivo' })
  @ApiQuery({ name: 'deviceId', required: true })
  async getLatest(@Query('deviceId') deviceId: string) {
    return this.service.getLatest(deviceId);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Serie temporal de variables IoT con resolución variable' })
  @ApiQuery({ name: 'deviceId', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'columns', required: true, description: 'Columnas separadas por coma' })
  @ApiQuery({ name: 'resolution', required: false, enum: ['raw', 'hour', 'day'] })
  async getTimeSeries(
    @Query('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('columns') columns: string,
    @Query('resolution') resolution?: 'raw' | 'hour' | 'day',
  ) {
    const range = enforceRange(from, to);
    const cols = columns.split(',').map((c) => c.trim());
    return this.service.getTimeSeries(deviceId, range.from, range.to, cols, resolution || 'raw');
  }

  @Get()
  @ApiOperation({ summary: 'Lecturas IoT paginadas' })
  @ApiQuery({ name: 'deviceId', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getReadings(
    @Query('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const range = enforceRange(from, to);
    return this.service.getReadings(
      deviceId,
      range.from,
      range.to,
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('buildings')
  @ApiOperation({ summary: 'Resumen tipo edificio desde dispositivos IoT' })
  async getBuildingsSummary() {
    return this.service.getBuildingsSummary();
  }

  @Get('meters-latest')
  @ApiOperation({ summary: 'Última lectura por dispositivo (formato MeterLatestReading)' })
  async getMetersLatest() {
    return this.service.getMetersLatest();
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Agregados mensuales por dispositivo (formato MeterMonthly)' })
  @ApiQuery({ name: 'deviceId', required: true })
  async getMonthly(@Query('deviceId') deviceId: string) {
    return this.service.getMonthly(deviceId);
  }

  @Get('meter-readings')
  @ApiOperation({ summary: 'Lecturas formato MeterReading para un dispositivo' })
  @ApiQuery({ name: 'deviceId', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async getMeterReadings(
    @Query('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: string,
  ) {
    const range = enforceRange(from, to);
    return this.service.getMeterReadings(deviceId, range.from, range.to, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas resumen de lecturas IoT' })
  @ApiQuery({ name: 'deviceId', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async getStats(
    @Query('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const range = enforceRange(from, to);
    return this.service.getStats(deviceId, range.from, range.to);
  }
}
