import { Controller, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Alert, type AlertStatus } from './alert.entity';
import { AlertsService } from './alerts.service';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentAuthContext } from '../auth/current-auth-context.decorator';
import type { AuthorizationContext } from '../auth/auth.service';

@ApiTags('Alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @RequirePermissions('ALERTS_OVERVIEW', 'view')
  @ApiOperation({ summary: 'Listar alertas', description: 'Retorna alertas persistidas, incluyendo las de medidores offline.' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'acknowledged', 'resolved'] })
  @ApiQuery({ name: 'type', required: false, example: 'METER_OFFLINE' })
  @ApiQuery({ name: 'meterId', required: false, example: 'M001' })
  @ApiQuery({ name: 'buildingId', required: false, example: 'pac4220' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiOkResponse({ type: [Alert] })
  findAll(
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('status') status?: AlertStatus,
    @Query('type') type?: string,
    @Query('meterId') meterId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;

    return this.alertsService.findAll(authContext, {
      status,
      type,
      meterId,
      buildingId,
      limit: parsedLimit != null && Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('ALERT_DETAIL', 'view')
  @ApiOperation({ summary: 'Obtener alerta por ID', description: 'Retorna el detalle operativo de una alerta persistida.' })
  @ApiParam({ name: 'id', example: '0c5b2ea3-52bb-4a75-a19a-b7e36619e9bb' })
  @ApiOkResponse({ type: Alert })
  async findOne(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
  ) {
    const alert = await this.alertsService.findOne(id, authContext);
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  @Post('sync-offline')
  @RequirePermissions('ALERTS_OVERVIEW', 'manage')
  @ApiOperation({ summary: 'Sincronizar alertas offline', description: 'Evalúa el estado de todos los medidores y crea/resuelve alertas offline.' })
  syncOfflineAlerts(@CurrentAuthContext() authContext: AuthorizationContext) {
    return this.alertsService.scanOfflineMeters(authContext);
  }

  @Patch(':id/acknowledge')
  @RequirePermissions('ALERT_DETAIL', 'manage')
  @ApiOperation({ summary: 'Reconocer alerta', description: 'Marca una alerta activa como reconocida.' })
  @ApiParam({ name: 'id', example: '0c5b2ea3-52bb-4a75-a19a-b7e36619e9bb' })
  async acknowledge(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
  ) {
    const alert = await this.alertsService.acknowledge(id, authContext);
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }
}
