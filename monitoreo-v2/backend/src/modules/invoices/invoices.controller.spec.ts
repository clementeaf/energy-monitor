import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: [
    'billing_invoices:read',
    'billing_invoices:create',
    'billing_invoices:update',
    'billing_invoices:delete',
  ],
  buildingIds: [],
};

const invoice = {
  id: 'inv-1',
  tenantId: 't-1',
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
};

const lineItem = {
  id: 'li-1',
  invoiceId: 'inv-1',
  meterId: 'm-1',
  tenantUnitId: null,
  kwhConsumption: '100.00',
  totalNet: '18500.00',
};

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findLineItems: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      approve: jest.fn(),
      void: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: service }],
    }).compile();

    controller = module.get(InvoicesController);
  });

  it('findAll delegates to service with filters', async () => {
    service.findAll.mockResolvedValue([invoice]);
    const query = { buildingId: 'b-1', status: 'draft' };
    const result = await controller.findAll(user, query);
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], {
      buildingId: 'b-1',
      status: 'draft',
      periodStart: undefined,
      periodEnd: undefined,
    });
    expect(result).toEqual([invoice]);
  });

  it('findOne returns invoice', async () => {
    service.findOne.mockResolvedValue(invoice);
    const result = await controller.findOne('inv-1', user);
    expect(result).toEqual(invoice);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('findLineItems delegates to service', async () => {
    service.findLineItems.mockResolvedValue([lineItem]);
    const result = await controller.findLineItems('inv-1', user);
    expect(service.findLineItems).toHaveBeenCalledWith('inv-1', 't-1');
    expect(result).toEqual([lineItem]);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(invoice);
    const dto = {
      buildingId: 'b-1',
      invoiceNumber: 'INV-001',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    };
    const result = await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('t-1', 'u-1', dto);
    expect(result).toEqual(invoice);
  });

  it('update returns updated invoice', async () => {
    service.update.mockResolvedValue({ ...invoice, notes: 'Updated' });
    const result = await controller.update('inv-1', { notes: 'Updated' }, user);
    expect(result.notes).toBe('Updated');
  });

  it('update throws NotFoundException when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('missing', { notes: 'X' }, user)).rejects.toThrow(NotFoundException);
  });

  it('remove succeeds', async () => {
    service.remove.mockResolvedValue(true);
    await expect(controller.remove('inv-1', user)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException when not found', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('approve returns approved invoice', async () => {
    service.approve.mockResolvedValue({ ...invoice, status: 'approved' });
    const result = await controller.approve('inv-1', user);
    expect(result.status).toBe('approved');
  });

  it('approve throws NotFoundException when not found', async () => {
    service.approve.mockResolvedValue(null);
    await expect(controller.approve('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('void returns voided invoice', async () => {
    service.void.mockResolvedValue({ ...invoice, status: 'voided' });
    const result = await controller.void('inv-1', user);
    expect(result.status).toBe('voided');
  });

  it('void throws NotFoundException when not found', async () => {
    service.void.mockResolvedValue(null);
    await expect(controller.void('missing', user)).rejects.toThrow(NotFoundException);
  });
});
