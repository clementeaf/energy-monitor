import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: ['admin_tenants:read', 'admin_tenants:create', 'admin_tenants:update'],
  buildingIds: [],
};

const tenant = {
  id: 't-1',
  name: 'Globe Power',
  slug: 'globe-power',
  primaryColor: '#3D3BF3',
  secondaryColor: '#1E1E2F',
  sidebarColor: '#1E1E2F',
  accentColor: '#10B981',
  appTitle: 'Energy Monitor',
  logoUrl: null,
  faviconUrl: null,
};

describe('TenantsController', () => {
  let controller: TenantsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      getTheme: jest.fn(),
      onboard: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [{ provide: TenantsService, useValue: service }],
    }).compile();

    controller = module.get(TenantsController);
  });

  it('getMyTenant returns tenant for user', async () => {
    service.findById.mockResolvedValue(tenant);
    const result = await controller.getMyTenant(user);
    expect(service.findById).toHaveBeenCalledWith('t-1');
    expect(result).toEqual(tenant);
  });

  it('getMyTheme returns theme for user', async () => {
    const theme = {
      primaryColor: '#3D3BF3',
      secondaryColor: '#1E1E2F',
      sidebarColor: '#1E1E2F',
      accentColor: '#10B981',
      appTitle: 'Energy Monitor',
      logoUrl: null,
      faviconUrl: null,
    };
    service.getTheme.mockResolvedValue(theme);
    const result = await controller.getMyTheme(user);
    expect(result).toEqual(theme);
  });

  it('findAll delegates to service', async () => {
    service.findAll.mockResolvedValue([tenant]);
    const result = await controller.findAll();
    expect(result).toEqual([tenant]);
  });

  it('findOne delegates to service', async () => {
    service.findById.mockResolvedValue(tenant);
    const result = await controller.findOne('t-1');
    expect(result).toEqual(tenant);
  });

  it('onboard delegates to service', async () => {
    const dto = { name: 'New', adminEmail: 'a@b.com', adminAuthProvider: 'google' };
    const onboardResult = { tenant, adminUserId: 'u-1', rolesCreated: 7 };
    service.onboard.mockResolvedValue(onboardResult);
    const result = await controller.onboard(dto as any);
    expect(service.onboard).toHaveBeenCalledWith(dto);
    expect(result).toEqual(onboardResult);
  });

  it('update delegates to service', async () => {
    service.update.mockResolvedValue(tenant);
    const result = await controller.update('t-1', { name: 'Updated' });
    expect(service.update).toHaveBeenCalledWith('t-1', { name: 'Updated' });
    expect(result).toEqual(tenant);
  });

  it('update throws when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('x', { name: 'y' })).rejects.toThrow(NotFoundException);
  });

  it('deactivate delegates to service', async () => {
    service.deactivate.mockResolvedValue(true);
    await controller.deactivate('t-1');
    expect(service.deactivate).toHaveBeenCalledWith('t-1');
  });

  it('deactivate throws when not found', async () => {
    service.deactivate.mockResolvedValue(false);
    await expect(controller.deactivate('x')).rejects.toThrow(NotFoundException);
  });
});
