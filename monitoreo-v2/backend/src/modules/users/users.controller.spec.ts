import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const admin: JwtPayload = {
  sub: 'u-admin',
  email: 'admin@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: ['admin_users:read', 'admin_users:create', 'admin_users:update', 'admin_users:delete'],
  buildingIds: [],
};

const user = {
  id: 'u-1',
  tenantId: 't-1',
  email: 'user@test.com',
  displayName: 'Test User',
  authProvider: 'google',
  authProviderId: 'g-123',
  roleId: 'r-2',
  role: { id: 'r-2', name: 'Analyst', slug: 'analyst' },
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      enforceDeleteHierarchy: jest.fn().mockResolvedValue(undefined),
      getBuildingIds: jest.fn(),
      assignBuildings: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('findAll delegates to service with tenantId', async () => {
    service.findAll.mockResolvedValue([user]);
    const result = await controller.findAll(admin);
    expect(service.findAll).toHaveBeenCalledWith('t-1');
    expect(result).toEqual([user]);
  });

  it('findOne returns user', async () => {
    service.findOne.mockResolvedValue(user);
    const result = await controller.findOne('u-1', admin);
    expect(result).toEqual(user);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', admin)).rejects.toThrow(NotFoundException);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(user);
    const dto = { email: 'user@test.com', authProvider: 'google' as const, authProviderId: 'g-123', roleId: 'r-2' };
    const result = await controller.create(dto, admin);
    expect(service.create).toHaveBeenCalledWith('t-1', dto, 'r-1', 'super_admin');
    expect(result).toEqual(user);
  });

  it('update returns updated user', async () => {
    service.update.mockResolvedValue({ ...user, displayName: 'Nuevo' });
    const result = await controller.update('u-1', { displayName: 'Nuevo' }, admin);
    expect(result.displayName).toBe('Nuevo');
  });

  it('update throws NotFoundException when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('missing', { displayName: 'X' }, admin)).rejects.toThrow(NotFoundException);
  });

  it('remove succeeds', async () => {
    service.remove.mockResolvedValue(true);
    await expect(controller.remove('u-1', admin)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException when not found', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('missing', admin)).rejects.toThrow(NotFoundException);
  });

  it('getBuildingIds returns building IDs', async () => {
    service.findOne.mockResolvedValue(user);
    service.getBuildingIds.mockResolvedValue(['b-1', 'b-2']);
    const result = await controller.getBuildingIds('u-1', admin);
    expect(result).toEqual({ buildingIds: ['b-1', 'b-2'] });
  });

  it('getBuildingIds throws when user not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.getBuildingIds('missing', admin)).rejects.toThrow(NotFoundException);
  });

  it('assignBuildings delegates to service', async () => {
    service.findOne.mockResolvedValue(user);
    service.assignBuildings.mockResolvedValue(undefined);
    const result = await controller.assignBuildings('u-1', { buildingIds: ['b-1'] }, admin);
    expect(service.assignBuildings).toHaveBeenCalledWith('u-1', 't-1', ['b-1']);
    expect(result).toEqual({ buildingIds: ['b-1'] });
  });

  it('assignBuildings throws when user not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.assignBuildings('missing', { buildingIds: [] }, admin)).rejects.toThrow(NotFoundException);
  });
});
