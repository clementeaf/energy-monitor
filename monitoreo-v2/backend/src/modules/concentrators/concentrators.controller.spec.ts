import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConcentratorsController } from './concentrators.controller';
import { ConcentratorsService } from './concentrators.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: [
    'diagnostics:read',
    'admin_meters:read',
    'admin_meters:create',
    'admin_meters:update',
    'admin_meters:delete',
  ],
  buildingIds: [],
};

const concentrator = {
  id: 'c-1',
  tenantId: 't-1',
  buildingId: 'b-1',
  name: 'Concentrador A',
  model: 'Model X',
  serialNumber: null,
  ipAddress: null,
  firmwareVersion: null,
  status: 'online',
  lastHeartbeatAt: null,
  mqttConnected: false,
  batteryLevel: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const meterEntry = {
  concentratorId: 'c-1',
  meterId: 'm-1',
  busNumber: 1,
  modbusAddress: null,
};

describe('ConcentratorsController', () => {
  let controller: ConcentratorsController;
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
      controllers: [ConcentratorsController],
      providers: [{ provide: ConcentratorsService, useValue: service }],
    }).compile();

    controller = module.get(ConcentratorsController);
  });

  it('findAll delegates to service with tenant, buildingIds, and optional buildingId', async () => {
    service.findAll.mockResolvedValue([concentrator]);
    const result = await controller.findAll(user, 'b-1');
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], 'b-1');
    expect(result).toEqual([concentrator]);
  });

  it('findAll works without buildingId filter', async () => {
    service.findAll.mockResolvedValue([concentrator]);
    const result = await controller.findAll(user);
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], undefined);
    expect(result).toEqual([concentrator]);
  });

  it('findOne returns concentrator', async () => {
    service.findOne.mockResolvedValue(concentrator);
    const result = await controller.findOne('c-1', user);
    expect(result).toEqual(concentrator);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(concentrator);
    const dto = { buildingId: 'b-1', name: 'Concentrador A', model: 'Model X' };
    const result = await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('t-1', dto);
    expect(result).toEqual(concentrator);
  });

  it('update returns updated concentrator', async () => {
    service.update.mockResolvedValue({ ...concentrator, name: 'Nuevo' });
    const result = await controller.update('c-1', { name: 'Nuevo' }, user);
    expect(result.name).toBe('Nuevo');
  });

  it('update throws NotFoundException when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('missing', { name: 'X' }, user)).rejects.toThrow(NotFoundException);
  });

  it('remove succeeds', async () => {
    service.remove.mockResolvedValue(true);
    await expect(controller.remove('c-1', user)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException when not found', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('findMeters delegates to service', async () => {
    service.findMeters.mockResolvedValue([meterEntry]);
    const result = await controller.findMeters('c-1', user);
    expect(service.findMeters).toHaveBeenCalledWith('c-1', 't-1');
    expect(result).toEqual([meterEntry]);
  });

  it('addMeter returns entry', async () => {
    service.addMeter.mockResolvedValue(meterEntry);
    const dto = { meterId: 'm-1' };
    const result = await controller.addMeter('c-1', dto, user);
    expect(service.addMeter).toHaveBeenCalledWith('c-1', dto, 't-1');
    expect(result).toEqual(meterEntry);
  });

  it('addMeter throws NotFoundException when concentrator not found', async () => {
    service.addMeter.mockResolvedValue(null);
    await expect(controller.addMeter('missing', { meterId: 'm-1' }, user)).rejects.toThrow(NotFoundException);
  });

  it('removeMeter succeeds', async () => {
    service.removeMeter.mockResolvedValue(true);
    await expect(controller.removeMeter('c-1', 'm-1', user)).resolves.toBeUndefined();
  });

  it('removeMeter throws NotFoundException when not found', async () => {
    service.removeMeter.mockResolvedValue(false);
    await expect(controller.removeMeter('c-1', 'm-1', user)).rejects.toThrow(NotFoundException);
  });
});
