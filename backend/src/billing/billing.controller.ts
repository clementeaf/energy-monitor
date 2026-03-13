import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import {
  BillingCenterSummaryDto,
  BillingMonthlyDetailDto,
  BillingTariffDto,
} from './dto/billing-response.dto';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentAuthContext } from '../auth/current-auth-context.decorator';
import type { AuthorizationContext } from '../auth/auth.service';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('centers')
  @RequirePermissions('BILLING_OVERVIEW', 'view')
  @ApiOperation({
    summary: 'Centros con facturación',
    description: 'Lista de centros (center_name) con datos de facturación para filtros.',
  })
  @ApiOkResponse({ description: 'Lista de centros' })
  findCenters(@CurrentAuthContext() authContext: AuthorizationContext) {
    return this.billingService.findCenters(authContext);
  }

  @Get('summary')
  @RequirePermissions('BILLING_OVERVIEW', 'view')
  @ApiOperation({
    summary: 'Resumen ejecutivo por centro y mes',
    description: 'Totales por centro y mes (billing_center_summary).',
  })
  @ApiQuery({ name: 'year', required: false, example: 2025 })
  @ApiQuery({ name: 'centerName', required: false, example: 'Parque Arauco Kennedy' })
  @ApiOkResponse({ type: [BillingCenterSummaryDto] })
  findCenterSummaries(
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('year') year?: string,
    @Query('centerName') centerName?: string,
  ) {
    const yearNum = year != null ? parseInt(year, 10) : undefined;
    return this.billingService.findCenterSummaries(
      authContext,
      Number.isFinite(yearNum) ? yearNum : undefined,
      centerName,
    );
  }

  @Get('detail')
  @RequirePermissions('BILLING_OVERVIEW', 'view')
  @ApiOperation({
    summary: 'Detalle mensual por centro, mes y medidor',
    description: 'Detalle de facturación por local/medidor (billing_monthly_detail).',
  })
  @ApiQuery({ name: 'year', required: false, example: 2025 })
  @ApiQuery({ name: 'month', required: false, example: 1 })
  @ApiQuery({ name: 'centerName', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiOkResponse({ type: [BillingMonthlyDetailDto] })
  findMonthlyDetails(
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('centerName') centerName?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const yearNum = year != null ? parseInt(year, 10) : undefined;
    const monthNum = month != null ? parseInt(month, 10) : undefined;
    const limitNum = limit != null ? parseInt(limit, 10) : 50;
    const offsetNum = offset != null ? parseInt(offset, 10) : 0;
    return this.billingService.findMonthlyDetails(
      authContext,
      Number.isFinite(yearNum) ? yearNum : undefined,
      Number.isFinite(monthNum) ? monthNum : undefined,
      centerName,
      limitNum,
      offsetNum,
    );
  }

  @Get('tariffs')
  @RequirePermissions('BILLING_OVERVIEW', 'view')
  @ApiOperation({
    summary: 'Pliegos tarifarios',
    description: 'Tarifas de referencia por comuna y mes (billing_tariffs).',
  })
  @ApiQuery({ name: 'year', required: false, example: 2025 })
  @ApiOkResponse({ type: [BillingTariffDto] })
  findTariffs(
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('year') year?: string,
  ) {
    const yearNum = year != null ? parseInt(year, 10) : undefined;
    return this.billingService.findTariffs(
      authContext,
      Number.isFinite(yearNum) ? yearNum : undefined,
    );
  }
}
