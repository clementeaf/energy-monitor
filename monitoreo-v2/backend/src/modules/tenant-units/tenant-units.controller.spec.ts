import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantUnitsController } from './tenant-units.controller';
import { TenantUnitsService } from './tenant-units.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: [
    'admin_tenant_units:read',
    'admin_tenant_units:create',
    'admin_tenant_units:update',
    'admin_tenant_units:delete',
  ],
  buildingIds: [],
};

const unit = {
  id: 'tu-1',
  tenantId: 't-1',
  buildingId: 'b-1',
  name: 'Local 101',
  unitCode: 'L101',
  contactName: null,
  contactEmail: null,
  userId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const meterEntry = {
  tenantUnitId: 'tu-1',
  meterId: 'm-1',
};

describe('TenantUnitsController', () => {
  let controller: TenantUnitsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findMeters: jest.fn(),
      addMeter: jest.fn(),
      removeMeter: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [TenantUnitsController],
      providers: [{ provide: TenantUnitsService, useValue: service }],
    }).compile();

    controller = module.get(TenantUnitsController);
  });

  it('findAll delegates to service with tenant, buildingIds, and optional buildingId', async () => {
    service.findAll.mockResolvedValue([unit]);
    const result = await controller.findAll(user, 'b-1');
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], 'b-1');
    expect(result).toEqual([unit]);
  });

  it('findAll works without buildingId filter', async () => {
    service.findAll.mockResolvedValue([unit]);
    const result = await controller.findAll(user);
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], undefined);
    expect(result).toEqual([unit]);
  });

  it('findOne returns unit', async () => {
    service.findOne.mockResolvedValue(unit);
    const result = await controller.findOne('tu-1', user);
    expect(result).toEqual(unit);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(unit);
    const dto = { buildingId: 'b-1', name: 'Local 101', unitCode: 'L101' };
    const result = await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('t-1', dto);
    expect(result).toEqual(unit);
  });

  it('update returns updated unit', async () => {
    service.update.mockResolvedValue({ ...unit, name: 'Nuevo' });
    const result = await controller.update('tu-1', { name: 'Nuevo' }, user);
    expect(result.name).toBe('Nuevo');
  });

  it('update throws NotFoundException when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('missing', { name: 'X' }, user)).rejects.toThrow(NotFoundException);
  });

  it('remove succeeds', async () => {
    service.remove.mockResolvedValue(true);
    await expect(controller.remove('tu-1', user)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException when not found', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('findMeters delegates to service', async () => {
    service.findMeters.mockResolvedValue([meterEntry]);
    const result = await controller.findMeters('tu-1', user);
    expect(service.findMeters).toHaveBeenCalledWith('tu-1', 't-1');
    expect(result).toEqual([meterEntry]);
  });

  it('addMeter returns entry', async () => {
    service.addMeter.mockResolvedValue(meterEntry);
    const result = await controller.addMeter('tu-1', { meterId: 'm-1' }, user);
    expect(service.addMeter).toHaveBeenCalledWith('tu-1', 'm-1', 't-1');
    expect(result).toEqual(meterEntry);
  });

  it('addMeter throws NotFoundException when unit not found', async () => {
    service.addMeter.mockResolvedValue(null);
    await expect(controller.addMeter('missing', { meterId: 'm-1' }, user)).rejects.toThrow(NotFoundException);
  });

  it('removeMeter succeeds', async () => {
    service.removeMeter.mockResolvedValue(true);
    await expect(controller.removeMeter('tu-1', 'm-1', user)).resolves.toBeUndefined();
  });

  it('removeMeter throws NotFoundException when not found', async () => {
    service.removeMeter.mockResolvedValue(false);
    await expect(controller.removeMeter('tu-1', 'm-1', user)).rejects.toThrow(NotFoundException);
  });
});
