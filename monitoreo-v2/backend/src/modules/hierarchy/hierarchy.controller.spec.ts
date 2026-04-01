import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HierarchyController } from './hierarchy.controller';
import { HierarchyService } from './hierarchy.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: [
    'admin_hierarchy:read',
    'admin_hierarchy:create',
    'admin_hierarchy:update',
    'admin_hierarchy:delete',
  ],
  buildingIds: [],
};

const node = {
  id: 'node-1',
  tenantId: 't-1',
  buildingId: 'b-1',
  parentId: null,
  name: 'Piso 1',
  levelType: 'floor',
  sortOrder: 0,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('HierarchyController', () => {
  let controller: HierarchyController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findByBuilding: jest.fn(),
      findOne: jest.fn(),
      findMetersByNode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [HierarchyController],
      providers: [{ provide: HierarchyService, useValue: service }],
    }).compile();

    controller = module.get(HierarchyController);
  });

  it('findByBuilding delegates to service with tenant and buildingIds', async () => {
    service.findByBuilding.mockResolvedValue([node]);
    const result = await controller.findByBuilding('b-1', user);
    expect(service.findByBuilding).toHaveBeenCalledWith('t-1', 'b-1', []);
    expect(result).toEqual([node]);
  });

  it('findOne returns node', async () => {
    service.findOne.mockResolvedValue(node);
    const result = await controller.findOne('node-1', user);
    expect(result).toEqual(node);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('findMetersByNode delegates to service', async () => {
    const meters = [{ meterId: 'm-1', hierarchyNodeId: 'node-1' }];
    service.findMetersByNode.mockResolvedValue(meters);
    const result = await controller.findMetersByNode('node-1', user);
    expect(service.findMetersByNode).toHaveBeenCalledWith('node-1', 't-1');
    expect(result).toEqual(meters);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(node);
    const dto = { buildingId: 'b-1', name: 'Piso 1', levelType: 'floor' as const };
    const result = await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('t-1', dto);
    expect(result).toEqual(node);
  });

  it('update returns updated node', async () => {
    service.update.mockResolvedValue({ ...node, name: 'Piso 2' });
    const result = await controller.update('node-1', { name: 'Piso 2' }, user);
    expect(result.name).toBe('Piso 2');
  });

  it('update throws NotFoundException when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('missing', { name: 'X' }, user)).rejects.toThrow(NotFoundException);
  });

  it('remove succeeds', async () => {
    service.remove.mockResolvedValue(true);
    await expect(controller.remove('node-1', user)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException when not found', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('missing', user)).rejects.toThrow(NotFoundException);
  });
});
