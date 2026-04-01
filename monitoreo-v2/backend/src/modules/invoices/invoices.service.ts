import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../platform/entities/invoice.entity';
import { InvoiceLineItem } from '../platform/entities/invoice-line-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepo: Repository<InvoiceLineItem>,
  ) {}

  async findAll(
    tenantId: string,
    buildingIds: string[],
    filters?: {
      buildingId?: string;
      status?: string;
      periodStart?: string;
      periodEnd?: string;
    },
  ): Promise<Invoice[]> {
    const qb = this.invoiceRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .orderBy('i.period_end', 'DESC')
      .addOrderBy('i.invoice_number', 'DESC');

    if (buildingIds.length > 0) {
      qb.andWhere('i.building_id IN (:...buildingIds)', { buildingIds });
    }

    if (filters?.buildingId) {
      qb.andWhere('i.building_id = :buildingId', { buildingId: filters.buildingId });
    }

    if (filters?.status) {
      qb.andWhere('i.status = :status', { status: filters.status });
    }

    if (filters?.periodStart) {
      qb.andWhere('i.period_start >= :periodStart', { periodStart: filters.periodStart });
    }

    if (filters?.periodEnd) {
      qb.andWhere('i.period_end <= :periodEnd', { periodEnd: filters.periodEnd });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<Invoice | null> {
    const qb = this.invoiceRepo
      .createQueryBuilder('i')
      .where('i.id = :id', { id })
      .andWhere('i.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('i.building_id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getOne();
  }

  async findLineItems(invoiceId: string, tenantId: string): Promise<InvoiceLineItem[]> {
    const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId, tenantId });
    if (!invoice) return [];

    return this.lineItemRepo.find({ where: { invoiceId } });
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    const invoice = this.invoiceRepo.create({
      tenantId,
      buildingId: dto.buildingId,
      tariffId: dto.tariffId ?? null,
      invoiceNumber: dto.invoiceNumber,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      status: 'draft',
      notes: dto.notes ?? null,
      createdBy: userId,
    });
    return this.invoiceRepo.save(invoice);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateInvoiceDto,
  ): Promise<Invoice | null> {
    const invoice = await this.invoiceRepo.findOneBy({ id, tenantId });
    if (!invoice) return null;

    if (invoice.status !== 'draft' && invoice.status !== 'pending') {
      throw new BadRequestException(
        `Cannot update invoice in '${invoice.status}' status. Only draft or pending invoices can be updated.`,
      );
    }

    if (dto.tariffId !== undefined) invoice.tariffId = dto.tariffId ?? null;
    if (dto.periodStart !== undefined) invoice.periodStart = dto.periodStart;
    if (dto.periodEnd !== undefined) invoice.periodEnd = dto.periodEnd;
    if (dto.notes !== undefined) invoice.notes = dto.notes ?? null;
    if (dto.totalNet !== undefined) invoice.totalNet = String(dto.totalNet);
    if (dto.taxRate !== undefined) invoice.taxRate = String(dto.taxRate);
    if (dto.taxAmount !== undefined) invoice.taxAmount = String(dto.taxAmount);
    if (dto.total !== undefined) invoice.total = String(dto.total);

    return this.invoiceRepo.save(invoice);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const invoice = await this.invoiceRepo.findOneBy({ id, tenantId });
    if (!invoice) return false;

    if (invoice.status !== 'draft') {
      throw new BadRequestException(
        `Cannot delete invoice in '${invoice.status}' status. Only draft invoices can be deleted.`,
      );
    }

    const result = await this.invoiceRepo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async approve(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<Invoice | null> {
    const invoice = await this.invoiceRepo.findOneBy({ id, tenantId });
    if (!invoice) return null;

    if (invoice.status !== 'pending') {
      throw new BadRequestException(
        `Cannot approve invoice in '${invoice.status}' status. Only pending invoices can be approved.`,
      );
    }

    invoice.status = 'approved';
    invoice.approvedBy = userId;
    invoice.approvedAt = new Date();

    return this.invoiceRepo.save(invoice);
  }

  async void(id: string, tenantId: string): Promise<Invoice | null> {
    const invoice = await this.invoiceRepo.findOneBy({ id, tenantId });
    if (!invoice) return null;

    invoice.status = 'voided';

    return this.invoiceRepo.save(invoice);
  }
}
