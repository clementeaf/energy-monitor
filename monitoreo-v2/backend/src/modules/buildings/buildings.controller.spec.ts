import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: ['admin_buildings:read', 'admin_buildings:create', 'admin_buildings:update', 'admin_buildings:delete'],
  buildingIds: [],
};

const building = {
  id: 'b-1',
  tenantId: 't-1',
  name: 'Edificio A',
  code: 'EA',
  address: null,
  areaSqm: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BuildingsController', () => {
  let controller: BuildingsController;
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
      controllers: [BuildingsController],
      providers: [{ provide: BuildingsService, useValue: service }],
    }).compile();

    controller = module.get(BuildingsController);
  });

  it('findAll delegates to service with tenant and buildingIds', async () => {
    service.findAll.mockResolvedValue([building]);
    const result = await controller.findAll(user);
    expect(service.findAll).toHaveBeenCalledWith('t-1', []);
    expect(result).toEqual([building]);
  });

  it('findOne returns building', async () => {
    service.findOne.mockResolvedValue(building);
    const result = await controller.findOne('b-1', user);
    expect(result).toEqual(building);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(building);
    const result = await controller.create({ name: 'Edificio A', code: 'EA' }, user);
    expect(service.create).toHaveBeenCalledWith('t-1', { name: 'Edificio A', code: 'EA' });
    expect(result).toEqual(building);
  });

  it('update returns updated building', async () => {
    service.update.mockResolvedValue({ ...building, name: 'Nuevo' });
    const result = await controller.update('b-1', { name: 'Nuevo' }, user);
    expect(result.name).toBe('Nuevo');
  });

  it('update throws NotFoundException when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('missing', { name: 'X' }, user)).rejects.toThrow(NotFoundException);
  });

  it('remove succeeds', async () => {
    service.remove.mockResolvedValue(true);
    await expect(controller.remove('b-1', user)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException when not found', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('missing', user)).rejects.toThrow(NotFoundException);
  });
});
