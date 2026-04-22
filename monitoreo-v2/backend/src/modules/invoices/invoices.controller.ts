import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Res,
  NotFoundException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';
import { escapeHtml } from '../../common/security/html-escape';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission('billing', 'read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryInvoicesDto,
  ) {
    return this.invoicesService.findAll(user.tenantId, user.buildingIds, {
      buildingId: query.buildingId,
      status: query.status,
      periodStart: query.periodStart,
      periodEnd: query.periodEnd,
    });
  }

  @Get('my')
  @RequirePermission('billing', 'view_own')
  async findMy(@CurrentUser() user: JwtPayload) {
    return this.invoicesService.findAll(user.tenantId, user.buildingIds, {});
  }

  @Get(':id')
  @RequirePermission('billing', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const invoice = await this.invoicesService.findOne(id, user.tenantId, user.buildingIds);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Get(':id/line-items')
  @RequirePermission('billing', 'read')
  async findLineItems(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.findLineItems(id, user.tenantId);
  }

  @Post()
  @RequirePermission('billing', 'create')
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.create(user.tenantId, user.sub, dto);
  }

  @Patch(':id')
  @RequirePermission('billing', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const invoice = await this.invoicesService.update(id, user.tenantId, dto);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('billing', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.invoicesService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Invoice not found');
  }

  @Patch(':id/approve')
  @RequirePermission('billing', 'update')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const invoice = await this.invoicesService.approve(id, user.tenantId, user.sub);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Patch(':id/void')
  @RequirePermission('billing', 'update')
  async void(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const invoice = await this.invoicesService.void(id, user.tenantId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Post('generate')
  @RequirePermission('billing', 'create')
  async generate(
    @Body() dto: GenerateInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.generate(user.tenantId, user.sub, dto);
  }

  @Get(':id/pdf')
  @RequirePermission('billing', 'read')
  async pdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOneWithLineItems(
      id,
      user.tenantId,
      user.buildingIds,
    );
    if (!invoice) throw new NotFoundException('Invoice not found');

    // Build simple HTML invoice
    // Security: escape ALL dynamic values to prevent stored XSS
    const e = escapeHtml;
    const lineRows = invoice.lineItems
      .map(
        (li) =>
          `<tr>
            <td>${e(li.meterId.slice(0, 8))}</td>
            <td style="text-align:right">${e(li.kwhConsumption)}</td>
            <td style="text-align:right">${e(li.kwDemandMax)}</td>
            <td style="text-align:right">${e(li.energyCharge)}</td>
            <td style="text-align:right">${e(li.demandCharge)}</td>
            <td style="text-align:right">${e(li.reactiveCharge)}</td>
            <td style="text-align:right">${e(li.fixedCharge)}</td>
            <td style="text-align:right"><strong>${e(li.totalNet)}</strong></td>
          </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; font-size: 12px; }
  h1 { color: #1a1a2e; font-size: 20px; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; }
  th { background: #f0f0f5; text-align: left; }
  .summary { margin-top: 20px; }
  .summary td { border: none; padding: 4px 8px; }
  .summary .label { text-align: right; font-weight: bold; }
</style>
</head><body>
  <h1>Factura ${e(invoice.invoiceNumber)}</h1>
  <p><strong>Periodo:</strong> ${e(invoice.periodStart)} a ${e(invoice.periodEnd)}</p>
  <p><strong>Estado:</strong> ${e(invoice.status)}</p>
  <table>
    <thead>
      <tr>
        <th>Medidor</th><th>kWh</th><th>kW Max</th>
        <th>Cargo Energia</th><th>Cargo Demanda</th>
        <th>Cargo Reactiva</th><th>Cargo Fijo</th><th>Total Neto</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>
  <table class="summary">
    <tr><td class="label">Total Neto:</td><td>$${e(invoice.totalNet)}</td></tr>
    <tr><td class="label">IVA (${e((parseFloat(invoice.taxRate) * 100).toFixed(0))}%):</td><td>$${e(invoice.taxAmount)}</td></tr>
    <tr><td class="label">Total:</td><td><strong>$${e(invoice.total)}</strong></td></tr>
  </table>
</body></html>`;

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="factura-${invoice.invoiceNumber}.html"`,
    });
    res.send(html);
  }
}
