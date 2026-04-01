import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Invoice } from '../platform/entities/invoice.entity';
import { InvoiceLineItem } from '../platform/entities/invoice-line-item.entity';

const TENANT_ID = 'tenant-1';

const mockInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-1',
  tenantId: TENANT_ID,
  buildingId: 'b-1',
  tariffId: null,
  invoiceNumber: 'INV-001',
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
  status: 'draft',
  totalNet: '0.00',
  taxRate: '0.1900',
  taxAmount: '0.00',
  total: '0.00',
  notes: null,
  approvedBy: null,
  approvedAt: null,
  createdBy: 'u-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {} as any,
  building: {} as any,
  tariff: null,
  approvedByUser: null,
  createdByUser: {} as any,
  ...overrides,
});

const mockLineItem = (overrides: Partial<InvoiceLineItem> = {}): InvoiceLineItem => ({
  id: 'li-1',
  invoiceId: 'inv-1',
  meterId: 'm-1',
  tenantUnitId: null,
  kwhConsumption: '100.00',
  kwDemandMax: '50.00',
  kvarhReactive: '10.00',
  kwhExported: '0.00',
  netBalance: '100.00',
  energyCharge: '12000.00',
  demandCharge: '5000.00',
  reactiveCharge: '1000.00',
  fixedCharge: '500.00',
  totalNet: '18500.00',
  invoice: {} as any,
  meter: {} as any,
  tenantUnit: null,
  ...overrides,
});

describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoiceRepo: Record<string, jest.Mock>;
  let lineItemRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    invoiceRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };

    lineItemRepo = {
      find: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        { provide: getRepositoryToken(InvoiceLineItem), useValue: lineItemRepo },
      ],
    }).compile();

    service = module.get(InvoicesService);
  });

  describe('findAll', () => {
    it('returns invoices for tenant without scoping when buildingIds is empty', async () => {
      const invoices = [mockInvoice()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(invoices),
      };
      invoiceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_ID, []);

      expect(qb.where).toHaveBeenCalledWith('i.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(result).toEqual(invoices);
    });

    it('scopes by buildingIds when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      invoiceRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['b-1', 'b-2']);

      expect(qb.andWhere).toHaveBeenCalledWith('i.building_id IN (:...buildingIds)', { buildingIds: ['b-1', 'b-2'] });
    });

    it('applies filters when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      invoiceRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, [], {
        buildingId: 'b-1',
        status: 'draft',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('i.building_id = :buildingId', { buildingId: 'b-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('i.status = :status', { status: 'draft' });
      expect(qb.andWhere).toHaveBeenCalledWith('i.period_start >= :periodStart', { periodStart: '2026-01-01' });
      expect(qb.andWhere).toHaveBeenCalledWith('i.period_end <= :periodEnd', { periodEnd: '2026-01-31' });
    });
  });

  describe('findOne', () => {
    it('returns invoice when found', async () => {
      const invoice = mockInvoice();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(invoice),
      };
      invoiceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('inv-1', TENANT_ID, []);
      expect(result).toEqual(invoice);
    });

    it('returns null when not found', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      invoiceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('missing', TENANT_ID, []);
      expect(result).toBeNull();
    });
  });

  describe('findLineItems', () => {
    it('returns line items when invoice exists', async () => {
      const items = [mockLineItem()];
      invoiceRepo.findOneBy.mockResolvedValue(mockInvoice());
      lineItemRepo.find.mockResolvedValue(items);

      const result = await service.findLineItems('inv-1', TENANT_ID);
      expect(result).toEqual(items);
    });

    it('returns empty array when invoice not found', async () => {
      invoiceRepo.findOneBy.mockResolvedValue(null);

      const result = await service.findLineItems('missing', TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates an invoice with status draft and createdBy', async () => {
      const invoice = mockInvoice();
      invoiceRepo.create.mockReturnValue(invoice);
      invoiceRepo.save.mockResolvedValue(invoice);

      const result = await service.create(TENANT_ID, 'u-1', {
        buildingId: 'b-1',
        invoiceNumber: 'INV-001',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      });

      expect(invoiceRepo.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        buildingId: 'b-1',
        tariffId: null,
        invoiceNumber: 'INV-001',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        status: 'draft',
        notes: null,
        createdBy: 'u-1',
      });
      expect(result).toEqual(invoice);
    });
  });

  describe('update', () => {
    it('updates and returns invoice when found and status is draft', async () => {
      const invoice = mockInvoice({ status: 'draft' });
      invoiceRepo.findOneBy.mockResolvedValue({ ...invoice });
      invoiceRepo.save.mockImplementation((i) => Promise.resolve(i));

      const result = await service.update('inv-1', TENANT_ID, { notes: 'Updated' });

      expect(result?.notes).toBe('Updated');
    });

    it('updates decimal fields with String conversion', async () => {
      const invoice = mockInvoice({ status: 'draft' });
      invoiceRepo.findOneBy.mockResolvedValue({ ...invoice });
      invoiceRepo.save.mockImplementation((i) => Promise.resolve(i));

      const result = await service.update('inv-1', TENANT_ID, { totalNet: 1500.50 });

      expect(result?.totalNet).toBe('1500.5');
    });

    it('returns null when invoice not found', async () => {
      invoiceRepo.findOneBy.mockResolvedValue(null);

      const result = await service.update('missing', TENANT_ID, { notes: 'X' });
      expect(result).toBeNull();
    });

    it('throws BadRequestException when status is not draft or pending', async () => {
      const invoice = mockInvoice({ status: 'approved' });
      invoiceRepo.findOneBy.mockResolvedValue({ ...invoice });

      await expect(
        service.update('inv-1', TENANT_ID, { notes: 'X' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('returns true when deleted and status is draft', async () => {
      invoiceRepo.findOneBy.mockResolvedValue(mockInvoice({ status: 'draft' }));
      invoiceRepo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('inv-1', TENANT_ID)).toBe(true);
    });

    it('returns false when not found', async () => {
      invoiceRepo.findOneBy.mockResolvedValue(null);
      expect(await service.remove('missing', TENANT_ID)).toBe(false);
    });

    it('throws BadRequestException when status is not draft', async () => {
      invoiceRepo.findOneBy.mockResolvedValue(mockInvoice({ status: 'pending' }));

      await expect(service.remove('inv-1', TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('approves invoice when status is pending', async () => {
      const invoice = mockInvoice({ status: 'pending' });
      invoiceRepo.findOneBy.mockResolvedValue({ ...invoice });
      invoiceRepo.save.mockImplementation((i) => Promise.resolve(i));

      const result = await service.approve('inv-1', TENANT_ID, 'u-1');

      expect(result?.status).toBe('approved');
      expect(result?.approvedBy).toBe('u-1');
      expect(result?.approvedAt).toBeInstanceOf(Date);
    });

    it('returns null when invoice not found', async () => {
      invoiceRepo.findOneBy.mockResolvedValue(null);

      const result = await service.approve('missing', TENANT_ID, 'u-1');
      expect(result).toBeNull();
    });

    it('throws BadRequestException when status is not pending', async () => {
      const invoice = mockInvoice({ status: 'draft' });
      invoiceRepo.findOneBy.mockResolvedValue({ ...invoice });

      await expect(
        service.approve('inv-1', TENANT_ID, 'u-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('void', () => {
    it('voids invoice', async () => {
      const invoice = mockInvoice({ status: 'approved' });
      invoiceRepo.findOneBy.mockResolvedValue({ ...invoice });
      invoiceRepo.save.mockImplementation((i) => Promise.resolve(i));

      const result = await service.void('inv-1', TENANT_ID);
      expect(result?.status).toBe('voided');
    });

    it('returns null when invoice not found', async () => {
      invoiceRepo.findOneBy.mockResolvedValue(null);

      const result = await service.void('missing', TENANT_ID);
      expect(result).toBeNull();
    });
  });
});
