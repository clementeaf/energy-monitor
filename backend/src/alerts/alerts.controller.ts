import { Controller, Get, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async findAll(
    @Query('severity') severity?: string,
    @Query('meter_id') meterId?: string,
  ) {
    return this.alertsService.findAll({ severity, meterId });
  }
}
