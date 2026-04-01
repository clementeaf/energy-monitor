import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission('billing_invoices', 'read')
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

  @Get(':id')
  @RequirePermission('billing_invoices', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const invoice = await this.invoicesService.findOne(id, user.tenantId, user.buildingIds);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Get(':id/line-items')
  @RequirePermission('billing_invoices', 'read')
  async findLineItems(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.findLineItems(id, user.tenantId);
  }

  @Post()
  @RequirePermission('billing_invoices', 'create')
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.create(user.tenantId, user.sub, dto);
  }

  @Patch(':id')
  @RequirePermission('billing_invoices', 'update')
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
  @RequirePermission('billing_invoices', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.invoicesService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Invoice not found');
  }

  @Patch(':id/approve')
  @RequirePermission('billing_invoices', 'update')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const invoice = await this.invoicesService.approve(id, user.tenantId, user.sub);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Patch(':id/void')
  @RequirePermission('billing_invoices', 'update')
  async void(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const invoice = await this.invoicesService.void(id, user.tenantId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
}
