import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from '../platform/entities/invoice.entity';
import { InvoiceLineItem } from '../platform/entities/invoice-line-item.entity';
import { Meter } from '../platform/entities/meter.entity';
import { Tariff } from '../platform/entities/tariff.entity';
import { TariffBlock } from '../platform/entities/tariff-block.entity';
import { TenantUnitMeter } from '../platform/entities/tenant-unit-meter.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepo: Repository<InvoiceLineItem>,
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
    @InjectRepository(Tariff)
    private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(TariffBlock)
    private readonly blockRepo: Repository<TariffBlock>,
    @InjectRepository(TenantUnitMeter)
    private readonly tenantUnitMeterRepo: Repository<TenantUnitMeter>,
    private readonly dataSource: DataSource,
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

  async generate(
    tenantId: string,
    userId: string,
    dto: GenerateInvoiceDto,
  ): Promise<Invoice> {
    // 1. Validate tariff exists and belongs to tenant
    const tariff = await this.tariffRepo.findOneBy({ id: dto.tariffId, tenantId });
    if (!tariff) {
      throw new BadRequestException('Tariff not found');
    }

    // 2. Load tariff blocks
    const blocks = await this.blockRepo.find({ where: { tariffId: dto.tariffId } });
    if (blocks.length === 0) {
      throw new BadRequestException('Tariff has no blocks configured');
    }

    // 3. Get meters for this building (optionally filtered)
    const meterQb = this.meterRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.building_id = :buildingId', { buildingId: dto.buildingId })
      .andWhere('m.is_active = true');

    if (dto.meterIds && dto.meterIds.length > 0) {
      meterQb.andWhere('m.id IN (:...meterIds)', { meterIds: dto.meterIds });
    }

    const meters = await meterQb.getMany();
    if (meters.length === 0) {
      throw new BadRequestException('No active meters found for this building');
    }

    // 4. Pre-load tenant-unit mapping for all meters
    const tenantUnitMap = new Map<string, string>();
    const tums = await this.tenantUnitMeterRepo
      .createQueryBuilder('tum')
      .where('tum.meter_id IN (:...meterIds)', { meterIds: meters.map((m) => m.id) })
      .getMany();

    // If tenantUnitIds filter, only include matching
    for (const tum of tums) {
      if (!dto.tenantUnitIds || dto.tenantUnitIds.includes(tum.tenantUnitId)) {
        tenantUnitMap.set(tum.meterId, tum.tenantUnitId);
      }
    }

    // 5. Build hour→block lookup (first match wins; blocks may overlap)
    const hourToBlock = new Map<number, TariffBlock>();
    for (const block of blocks) {
      const start = block.hourStart;
      const end = block.hourEnd;
      if (start <= end) {
        for (let h = start; h < end; h++) hourToBlock.set(h, block);
      } else {
        // overnight block (e.g. 23→6)
        for (let h = start; h < 24; h++) hourToBlock.set(h, block);
        for (let h = 0; h < end; h++) hourToBlock.set(h, block);
      }
    }

    // 6. Query aggregated readings per meter: kwh, max demand, reactive
    const readingsAgg: Array<{
      meter_id: string;
      kwh: string;
      kw_max: string;
      kvarh: string;
    }> = await this.dataSource.query(
      `SELECT
         r.meter_id,
         COALESCE(SUM(r.power_kw * 0.25), 0)::numeric(12,2) AS kwh,
         COALESCE(MAX(r.power_kw), 0)::numeric(10,2)         AS kw_max,
         COALESCE(SUM(COALESCE(r.reactive_power_kvar, 0) * 0.25), 0)::numeric(12,2) AS kvarh
       FROM readings r
       WHERE r.tenant_id = $1
         AND r.meter_id = ANY($2)
         AND r.timestamp >= $3::date
         AND r.timestamp < $4::date + INTERVAL '1 day'
       GROUP BY r.meter_id`,
      [tenantId, meters.map((m) => m.id), dto.periodStart, dto.periodEnd],
    );

    const readingsMap = new Map(readingsAgg.map((r) => [r.meter_id, r]));

    // 7. Query per-hour kwh for block-based pricing
    const hourlyAgg: Array<{
      meter_id: string;
      hr: string;
      kwh: string;
    }> = await this.dataSource.query(
      `SELECT
         r.meter_id,
         EXTRACT(HOUR FROM r.timestamp)::int AS hr,
         COALESCE(SUM(r.power_kw * 0.25), 0)::numeric(12,2) AS kwh
       FROM readings r
       WHERE r.tenant_id = $1
         AND r.meter_id = ANY($2)
         AND r.timestamp >= $3::date
         AND r.timestamp < $4::date + INTERVAL '1 day'
       GROUP BY r.meter_id, EXTRACT(HOUR FROM r.timestamp)`,
      [tenantId, meters.map((m) => m.id), dto.periodStart, dto.periodEnd],
    );

    // meter_id → hour → kwh
    const hourlyMap = new Map<string, Map<number, number>>();
    for (const row of hourlyAgg) {
      if (!hourlyMap.has(row.meter_id)) hourlyMap.set(row.meter_id, new Map());
      hourlyMap.get(row.meter_id)!.set(Number(row.hr), parseFloat(row.kwh));
    }

    // 8. Generate invoice number
    const count = await this.invoiceRepo.count({ where: { tenantId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

    // 9. Build line items
    const lineItems: Partial<InvoiceLineItem>[] = [];
    let invoiceTotalNet = 0;

    for (const meter of meters) {
      const agg = readingsMap.get(meter.id);
      const kwh = agg ? parseFloat(agg.kwh) : 0;
      const kwMax = agg ? parseFloat(agg.kw_max) : 0;
      const kvarh = agg ? parseFloat(agg.kvarh) : 0;

      // Compute energy charge by block
      let energyCharge = 0;
      const meterHourly = hourlyMap.get(meter.id);
      if (meterHourly) {
        for (const [hour, hKwh] of meterHourly) {
          const block = hourToBlock.get(hour);
          if (block) {
            energyCharge += hKwh * parseFloat(block.energyRate);
          }
        }
      }

      // Demand charge: max kW * highest demand rate among blocks
      const maxDemandRate = Math.max(...blocks.map((b) => parseFloat(b.demandRate)));
      const demandCharge = kwMax * maxDemandRate;

      // Reactive charge: total kVArh * highest reactive rate
      const maxReactiveRate = Math.max(...blocks.map((b) => parseFloat(b.reactiveRate)));
      const reactiveCharge = kvarh * maxReactiveRate;

      // Fixed charge: sum of all block fixed charges (monthly)
      const fixedCharge = blocks.reduce((sum, b) => sum + parseFloat(b.fixedCharge), 0);

      const totalNet = energyCharge + demandCharge + reactiveCharge + fixedCharge;
      invoiceTotalNet += totalNet;

      lineItems.push({
        meterId: meter.id,
        tenantUnitId: tenantUnitMap.get(meter.id) ?? null,
        kwhConsumption: kwh.toFixed(2),
        kwDemandMax: kwMax.toFixed(2),
        kvarhReactive: kvarh.toFixed(2),
        kwhExported: '0.00',
        netBalance: kwh.toFixed(2),
        energyCharge: energyCharge.toFixed(2),
        demandCharge: demandCharge.toFixed(2),
        reactiveCharge: reactiveCharge.toFixed(2),
        fixedCharge: fixedCharge.toFixed(2),
        totalNet: totalNet.toFixed(2),
      });
    }

    const taxRate = 0.19;
    const taxAmount = invoiceTotalNet * taxRate;
    const total = invoiceTotalNet + taxAmount;

    // 10. Persist in a transaction
    return this.dataSource.transaction(async (manager) => {
      const invoice = manager.create(Invoice, {
        tenantId,
        buildingId: dto.buildingId,
        tariffId: dto.tariffId,
        invoiceNumber,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        status: 'draft',
        totalNet: invoiceTotalNet.toFixed(2),
        taxRate: taxRate.toFixed(4),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        createdBy: userId,
      });

      const saved = await manager.save(Invoice, invoice);

      const items = lineItems.map((li) =>
        manager.create(InvoiceLineItem, { ...li, invoiceId: saved.id }),
      );
      await manager.save(InvoiceLineItem, items);

      return saved;
    });
  }

  async findOneWithLineItems(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<(Invoice & { lineItems: InvoiceLineItem[] }) | null> {
    const invoice = await this.findOne(id, tenantId, buildingIds);
    if (!invoice) return null;

    const lineItems = await this.lineItemRepo.find({ where: { invoiceId: id } });
    return { ...invoice, lineItems };
  }
}
