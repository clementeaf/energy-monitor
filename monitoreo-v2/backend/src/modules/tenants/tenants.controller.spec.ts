import { Test } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: [],
  buildingIds: [],
};

const tenant = {
  id: 't-1',
  name: 'Globe Power',
  slug: 'globe-power',
  primaryColor: '#3D3BF3',
  secondaryColor: '#1E1E2F',
  logoUrl: null,
  faviconUrl: null,
};

describe('TenantsController', () => {
  let controller: TenantsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findById: jest.fn(),
      getTheme: jest.fn(),
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
    const theme = { primaryColor: '#3D3BF3', secondaryColor: '#1E1E2F', logoUrl: null, faviconUrl: null };
    service.getTheme.mockResolvedValue(theme);
    const result = await controller.getMyTheme(user);
    expect(service.getTheme).toHaveBeenCalledWith('t-1');
    expect(result).toEqual(theme);
  });
});
