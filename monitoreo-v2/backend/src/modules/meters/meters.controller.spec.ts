import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MetersController } from './meters.controller';
import { MetersService } from './meters.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: ['admin_meters:read', 'admin_meters:create', 'admin_meters:update', 'admin_meters:delete'],
  buildingIds: [],
};

const meter = {
  id: 'm-1',
  tenantId: 't-1',
  buildingId: 'bld-1',
  name: 'Medidor Principal',
  code: 'MP-001',
  meterType: 'electrical',
  isActive: true,
  metadata: {},
  externalId: null,
  model: null,
  serialNumber: null,
  ipAddress: null,
  modbusAddress: null,
  busId: null,
  phaseType: 'three_phase',
  diStatus: 'closed',
  doStatus: 'inactive',
  uplinkRoute: null,
  crcErrorsLastPoll: 0,
  nominalVoltage: null,
  nominalCurrent: null,
  contractedDemandKw: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MetersController', () => {
  let controller: MetersController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [MetersController],
      providers: [{ provide: MetersService, useValue: service }],
    }).compile();

    controller = module.get(MetersController);
  });

  it('findAll delegates to service with tenant, buildingIds, and optional filter', async () => {
    service.findAll.mockResolvedValue([meter]);
    const result = await controller.findAll(user);
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], undefined, undefined);
    expect(result).toEqual([meter]);
  });

  it('findAll passes buildingId filter', async () => {
    service.findAll.mockResolvedValue([meter]);
    await controller.findAll(user, 'bld-1');
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], 'bld-1', undefined);
  });

  it('findOne returns meter', async () => {
    service.findOne.mockResolvedValue(meter);
    const result = await controller.findOne('m-1', user);
    expect(result).toEqual(meter);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(meter);
    const dto = { buildingId: 'bld-1', name: 'Medidor Principal', code: 'MP-001' };
    const result = await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('t-1', dto);
    expect(result).toEqual(meter);
  });

  it('update returns updated meter', async () => {
    service.update.mockResolvedValue({ ...meter, name: 'Nuevo' });
    const result = await controller.update('m-1', { name: 'Nuevo' }, user);
    expect(result.name).toBe('Nuevo');
  });

  it('update throws NotFoundException when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('missing', { name: 'X' }, user)).rejects.toThrow(NotFoundException);
  });

  it('remove succeeds', async () => {
    service.remove.mockResolvedValue(true);
    await expect(controller.remove('m-1', user)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException when not found', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('missing', user)).rejects.toThrow(NotFoundException);
  });
});
