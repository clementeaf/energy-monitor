import { Test } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'admin@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: ['admin_roles:read', 'admin_roles:create', 'admin_roles:update'],
  buildingIds: [],
};

const role = {
  id: 'r-1',
  tenantId: 't-1',
  name: 'Operator',
  slug: 'operator',
  description: 'Technical operator',
  maxSessionMinutes: 30,
  isDefault: false,
  isActive: true,
  permissions: [],
};

const permission = { id: 'p-1', module: 'buildings', action: 'read', description: null };

describe('RolesController', () => {
  let controller: RolesController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAllForTenant: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getRolePermissions: jest.fn(),
      assignPermissions: jest.fn(),
      getAllPermissions: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: service }],
    }).compile();

    controller = module.get(RolesController);
  });

  it('findAll returns roles for tenant', async () => {
    service.findAllForTenant.mockResolvedValue([role]);
    const result = await controller.findAll(user);
    expect(service.findAllForTenant).toHaveBeenCalledWith('t-1');
    expect(result).toEqual([role]);
  });

  it('findOne returns role', async () => {
    service.findOne.mockResolvedValue(role);
    const result = await controller.findOne('r-1', user);
    expect(result).toEqual(role);
  });

  it('findOne throws when missing', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('x', user)).rejects.toThrow(NotFoundException);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(role);
    const dto = { name: 'New', slug: 'new_role' };
    const result = await controller.create(dto as any, user);
    expect(service.create).toHaveBeenCalledWith('t-1', dto);
    expect(result).toEqual(role);
  });

  it('update delegates to service', async () => {
    service.update.mockResolvedValue(role);
    const result = await controller.update('r-1', { name: 'Updated' }, user);
    expect(service.update).toHaveBeenCalledWith('r-1', 't-1', { name: 'Updated' });
    expect(result).toEqual(role);
  });

  it('update throws when missing', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('x', { name: 'y' }, user)).rejects.toThrow(NotFoundException);
  });

  it('remove delegates to service', async () => {
    service.remove.mockResolvedValue(true);
    await controller.remove('r-1', user);
    expect(service.remove).toHaveBeenCalledWith('r-1', 't-1');
  });

  it('remove throws when missing', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('x', user)).rejects.toThrow(NotFoundException);
  });

  it('getPermissions returns permissions for role', async () => {
    service.getRolePermissions.mockResolvedValue([permission]);
    const result = await controller.getPermissions('r-1', user);
    expect(result).toEqual([permission]);
  });

  it('assignPermissions replaces permissions', async () => {
    service.assignPermissions.mockResolvedValue([permission]);
    const result = await controller.assignPermissions('r-1', { permissionIds: ['p-1'] }, user);
    expect(service.assignPermissions).toHaveBeenCalledWith('r-1', 't-1', ['p-1']);
    expect(result).toEqual([permission]);
  });

  it('getPermissionsCatalog returns all permissions', async () => {
    service.getAllPermissions.mockResolvedValue([permission]);
    const result = await controller.getPermissionsCatalog();
    expect(result).toEqual([permission]);
  });
});
