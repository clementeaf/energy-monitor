import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNotFoundResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { BuildingSummaryDto, ConsumptionPointDto } from './dto/building-response.dto';
import { Meter } from '../meters/meter.entity';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentAuthContext } from '../auth/current-auth-context.decorator';
import type { AuthorizationContext } from '../auth/auth.service';

@ApiTags('Buildings')
@ApiBearerAuth()
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @RequirePermissions('BUILDINGS_OVERVIEW', 'view')
  @ApiOperation({ summary: 'Listar edificios', description: 'Retorna todos los edificios con la cantidad de medidores.' })
  @ApiOkResponse({ type: [BuildingSummaryDto] })
  findAll(@CurrentAuthContext() authContext: AuthorizationContext) {
    return this.buildingsService.findAll(authContext);
  }

  @Get(':id')
  @RequirePermissions('BUILDING_DETAIL', 'view')
  @ApiOperation({ summary: 'Obtener edificio por ID' })
  @ApiParam({ name: 'id', example: 'pac4220' })
  @ApiOkResponse({ type: BuildingSummaryDto })
  @ApiNotFoundResponse({ description: 'Edificio no encontrado' })
  async findOne(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
  ) {
    const building = await this.buildingsService.findOne(id, authContext);
    if (!building) throw new NotFoundException();
    return building;
  }

  @Get(':id/meters')
  @RequirePermissions('BUILDING_DETAIL', 'view')
  @ApiOperation({ summary: 'Listar medidores de un edificio' })
  @ApiParam({ name: 'id', example: 'pac4220' })
  @ApiOkResponse({ type: [Meter] })
  async findMeters(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
  ) {
    const meters = await this.buildingsService.findMeters(id, authContext);
    if (!meters) throw new NotFoundException();
    return meters;
  }

  @Get(':id/consumption')
  @RequirePermissions('BUILDING_DETAIL', 'view')
  @ApiOperation({ summary: 'Consumo agregado de un edificio', description: 'Retorna serie temporal con potencia total, promedio y pico por intervalo.' })
  @ApiParam({ name: 'id', example: 'pac4220' })
  @ApiQuery({ name: 'resolution', required: false, enum: ['15min', 'hourly', 'daily'], description: 'Resolución temporal (default: hourly)' })
  @ApiQuery({ name: 'from', required: false, description: 'Inicio del rango (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, description: 'Fin del rango (ISO 8601)', example: '2026-03-06T23:59:59Z' })
  @ApiOkResponse({ type: [ConsumptionPointDto] })
  findConsumption(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('resolution') resolution?: '15min' | 'hourly' | 'daily',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.buildingsService.findConsumption(id, authContext, resolution ?? 'hourly', from, to);
  }
}
