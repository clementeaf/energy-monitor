import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'admin@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'corp_admin',
  permissions: ['api_keys:read', 'api_keys:create', 'api_keys:update'],
  buildingIds: [],
};

const apiKey = {
  id: 'ak-1',
  tenantId: 't-1',
  name: 'Test Key',
  keyHash: 'hash',
  keyPrefix: 'emk_abcd',
  permissions: ['buildings:read'],
  buildingIds: [],
  rateLimitPerMinute: 60,
  expiresAt: null,
  isActive: true,
  lastUsedAt: null,
  createdBy: 'u-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ApiKeysController', () => {
  let controller: ApiKeysController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      rotateKey: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [{ provide: ApiKeysService, useValue: service }],
    }).compile();

    controller = module.get(ApiKeysController);
  });

  it('findAll delegates to service', async () => {
    service.findAll.mockResolvedValue([apiKey]);
    const result = await controller.findAll(user);
    expect(service.findAll).toHaveBeenCalledWith('t-1');
    expect(result).toEqual([apiKey]);
  });

  it('findOne returns key', async () => {
    service.findOne.mockResolvedValue(apiKey);
    const result = await controller.findOne('ak-1', user);
    expect(result).toEqual(apiKey);
  });

  it('findOne throws when missing', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('x', user)).rejects.toThrow(NotFoundException);
  });

  it('create returns plain key and entity', async () => {
    service.create.mockResolvedValue({ plainKey: 'emk_abc', apiKey });
    const dto = { name: 'New', permissions: ['buildings:read'] };
    const result = await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('t-1', dto, 'u-1');
    expect(result.key).toBe('emk_abc');
    expect(result.apiKey).toEqual(apiKey);
  });

  it('update delegates to service', async () => {
    service.update.mockResolvedValue(apiKey);
    const result = await controller.update('ak-1', { name: 'Updated' }, user);
    expect(service.update).toHaveBeenCalledWith('ak-1', 't-1', { name: 'Updated' });
    expect(result).toEqual(apiKey);
  });

  it('update throws when missing', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('x', { name: 'y' }, user)).rejects.toThrow(NotFoundException);
  });

  it('rotate returns new plain key', async () => {
    service.rotateKey.mockResolvedValue({ plainKey: 'emk_new', apiKey });
    const result = await controller.rotate('ak-1', user);
    expect(service.rotateKey).toHaveBeenCalledWith('ak-1', 't-1');
    expect(result.key).toBe('emk_new');
  });

  it('remove delegates to service', async () => {
    service.remove.mockResolvedValue(true);
    await controller.remove('ak-1', user);
    expect(service.remove).toHaveBeenCalledWith('ak-1', 't-1');
  });

  it('remove throws when missing', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('x', user)).rejects.toThrow(NotFoundException);
  });
});
