import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { DashboardService } from './dashboard.service';

@Public()
@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumen mensual por edificio para el dashboard' })
  @ApiOkResponse({ description: 'Lista de edificios con consumo, gasto, medidores y superficie por mes' })
  async getSummary() {
    return this.dashboardService.getSummary();
  }
}
