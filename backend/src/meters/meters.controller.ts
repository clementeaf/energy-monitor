import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNotFoundResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MetersService } from './meters.service';
import { Meter } from './meter.entity';
import { Reading } from './reading.entity';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentAuthContext } from '../auth/current-auth-context.decorator';
import type { AuthorizationContext } from '../auth/auth.service';

@ApiTags('Meters')
@ApiBearerAuth()
@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get('overview')
  @RequirePermissions('MONITORING_DEVICES', 'view')
  @ApiOperation({ summary: 'Estado de todos los medidores', description: 'Retorna todos los medidores con status, uptime 24h y alarmas 30d.' })
  getOverview(@CurrentAuthContext() authContext: AuthorizationContext) {
    return this.metersService.getOverview(authContext);
  }

  @Get(':id')
  @RequirePermissions('METER_DETAIL', 'view')
  @ApiOperation({ summary: 'Obtener medidor por ID' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiOkResponse({ type: Meter })
  @ApiNotFoundResponse({ description: 'Medidor no encontrado' })
  async findOne(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
  ) {
    const meter = await this.metersService.findOne(id, authContext);
    if (!meter) throw new NotFoundException();
    return meter;
  }

  @Get(':id/uptime')
  @RequirePermissions('METER_DETAIL', 'view')
  @ApiOperation({ summary: 'Obtener resumen de uptime del medidor' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly', 'all'], description: 'Período (default: all)' })
  async getUptime(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly' | 'all',
  ) {
    const result = !period || period === 'all'
      ? await this.metersService.getUptimeAll(id, authContext)
      : await this.metersService.getUptimeSummary(id, authContext, period);

    if (!result) throw new NotFoundException();
    return result;
  }

  @Get(':id/downtime-events')
  @RequirePermissions('METER_DETAIL', 'view')
  @ApiOperation({ summary: 'Obtener eventos de downtime del medidor' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'from', required: true, description: 'Inicio (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: true, description: 'Fin (ISO 8601)', example: '2026-03-06T23:59:59Z' })
  async getDowntimeEvents(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const events = await this.metersService.getDowntimeEvents(id, authContext, from, to);
    if (!events) throw new NotFoundException();
    return events;
  }

  @Get(':id/alarm-events')
  @RequirePermissions('METER_DETAIL', 'view')
  @ApiOperation({ summary: 'Obtener eventos de alarma del medidor' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'from', required: true, description: 'Inicio (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: true, description: 'Fin (ISO 8601)', example: '2026-03-06T23:59:59Z' })
  async getAlarmEvents(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const events = await this.metersService.getAlarmEvents(id, authContext, from, to);
    if (!events) throw new NotFoundException();
    return events;
  }

  @Get(':id/alarm-summary')
  @RequirePermissions('METER_DETAIL', 'view')
  @ApiOperation({ summary: 'Obtener resumen de alarmas del medidor' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'from', required: true, description: 'Inicio (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: true, description: 'Fin (ISO 8601)', example: '2026-03-06T23:59:59Z' })
  async getAlarmSummary(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const summary = await this.metersService.getAlarmSummary(id, authContext, from, to);
    if (!summary) throw new NotFoundException();
    return summary;
  }

  @Get(':id/readings')
  @RequirePermissions('METER_DETAIL', 'view')
  @ApiOperation({ summary: 'Obtener lecturas de un medidor', description: 'Retorna lecturas crudas o agregadas (promedio) por hora/día.' })
  @ApiParam({ name: 'id', example: 'M001' })
  @ApiQuery({ name: 'resolution', required: false, enum: ['raw', '15min', 'hourly', 'daily'], description: 'Resolución temporal (default: hourly)' })
  @ApiQuery({ name: 'from', required: false, description: 'Inicio del rango (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, description: 'Fin del rango (ISO 8601)', example: '2026-03-06T23:59:59Z' })
  @ApiOkResponse({ type: [Reading] })
  async findReadings(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('resolution') resolution?: 'raw' | '15min' | 'hourly' | 'daily',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const readings = await this.metersService.findReadings(id, authContext, resolution ?? 'hourly', from, to);
    if (!readings) throw new NotFoundException();
    return readings;
  }
}
