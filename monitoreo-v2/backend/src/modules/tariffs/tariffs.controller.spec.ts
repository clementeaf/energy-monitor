import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: [
    'billing_tariffs:read',
    'billing_tariffs:create',
    'billing_tariffs:update',
    'billing_tariffs:delete',
  ],
  buildingIds: [],
};

const tariff = {
  id: 'tar-1',
  tenantId: 't-1',
  buildingId: 'b-1',
  name: 'Tarifa Verano',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  isActive: true,
  createdBy: 'u-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const block = {
  id: 'blk-1',
  tariffId: 'tar-1',
  blockName: 'Punta',
  hourStart: 18,
  hourEnd: 23,
  energyRate: '120.5000',
  demandRate: '50.0000',
  reactiveRate: '10.0000',
  fixedCharge: '5000.00',
};

describe('TariffsController', () => {
  let controller: TariffsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findBlocks: jest.fn(),
      createBlock: jest.fn(),
      removeBlock: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [TariffsController],
      providers: [{ provide: TariffsService, useValue: service }],
    }).compile();

    controller = module.get(TariffsController);
  });

  it('findAll delegates to service with tenant, buildingIds, and optional buildingId', async () => {
    service.findAll.mockResolvedValue([tariff]);
    const result = await controller.findAll(user, 'b-1');
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], 'b-1');
    expect(result).toEqual([tariff]);
  });

  it('findOne returns tariff', async () => {
    service.findOne.mockResolvedValue(tariff);
    const result = await controller.findOne('tar-1', user);
    expect(result).toEqual(tariff);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(tariff);
    const dto = { buildingId: 'b-1', name: 'Tarifa Verano', effectiveFrom: '2026-01-01' };
    const result = await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('t-1', 'u-1', dto);
    expect(result).toEqual(tariff);
  });

  it('update returns updated tariff', async () => {
    service.update.mockResolvedValue({ ...tariff, name: 'Nuevo' });
    const result = await controller.update('tar-1', { name: 'Nuevo' }, user);
    expect(result.name).toBe('Nuevo');
  });

  it('update throws NotFoundException when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('missing', { name: 'X' }, user)).rejects.toThrow(NotFoundException);
  });

  it('remove succeeds', async () => {
    service.remove.mockResolvedValue(true);
    await expect(controller.remove('tar-1', user)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException when not found', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('findBlocks delegates to service', async () => {
    service.findBlocks.mockResolvedValue([block]);
    const result = await controller.findBlocks('tar-1', user);
    expect(service.findBlocks).toHaveBeenCalledWith('tar-1', 't-1');
    expect(result).toEqual([block]);
  });

  it('createBlock returns block', async () => {
    service.createBlock.mockResolvedValue(block);
    const dto = { blockName: 'Punta', hourStart: 18, hourEnd: 23, energyRate: 120.5 };
    const result = await controller.createBlock('tar-1', dto, user);
    expect(service.createBlock).toHaveBeenCalledWith('tar-1', 't-1', dto);
    expect(result).toEqual(block);
  });

  it('createBlock throws NotFoundException when tariff not found', async () => {
    service.createBlock.mockResolvedValue(null);
    const dto = { blockName: 'Punta', hourStart: 18, hourEnd: 23, energyRate: 100 };
    await expect(controller.createBlock('missing', dto, user)).rejects.toThrow(NotFoundException);
  });

  it('removeBlock succeeds', async () => {
    service.removeBlock.mockResolvedValue(true);
    await expect(controller.removeBlock('tar-1', 'blk-1', user)).resolves.toBeUndefined();
  });

  it('removeBlock throws NotFoundException when not found', async () => {
    service.removeBlock.mockResolvedValue(false);
    await expect(controller.removeBlock('tar-1', 'missing', user)).rejects.toThrow(NotFoundException);
  });
});
