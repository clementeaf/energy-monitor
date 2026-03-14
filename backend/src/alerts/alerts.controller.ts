import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AlertsService } from './alerts.service';

@Public()
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
