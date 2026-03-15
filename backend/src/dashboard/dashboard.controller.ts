import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
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

  @Get('payments')
  @ApiOperation({ summary: 'Resumen de pagos, documentos por vencer y vencidos' })
  @ApiOkResponse({ description: 'Cards de pago + tabla de vencidos por período' })
  async getPayments() {
    return this.dashboardService.getPaymentSummary();
  }

  @Get('documents/:status')
  @ApiOperation({ summary: 'Lista de documentos de cobro por estado' })
  @ApiParam({ name: 'status', enum: ['pagado', 'por_vencer', 'vencido'] })
  @ApiOkResponse({ description: 'Documentos con detalle de edificio, vencimiento, neto, IVA y total' })
  async getDocumentsByStatus(@Param('status') status: string) {
    return this.dashboardService.getDocumentsByStatus(status);
  }
}
