import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegisterMappingsService } from './register-mappings.service';
import { RegisterMapping } from '../platform/entities/register-mapping.entity';
import { ProtocolType } from '../platform/entities/protocol-type.entity';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const tenantUser: JwtPayload = {
  sub: 'u-1',
  email: 'admin@tenant.test',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'operator',
  permissions: ['register_mappings:read', 'register_mappings:create'],
  buildingIds: [],
};

const superAdmin: JwtPayload = {
  ...tenantUser,
  roleSlug: 'super_admin',
  crossTenant: true,
  permissions: [],
};

describe('RegisterMappingsService', () => {
  let service: RegisterMappingsService;
  let mappingRepo: {
    createQueryBuilder: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let qb: {
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    qb = {
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mappingRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOneBy: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({ id: 'map-1', ...v })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module = await Test.createTestingModule({
      providers: [
        RegisterMappingsService,
        { provide: getRepositoryToken(RegisterMapping), useValue: mappingRepo },
        { provide: getRepositoryToken(ProtocolType), useValue: { find: jest.fn() } },
      ],
    }).compile();

    service = module.get(RegisterMappingsService);
  });

  it('findAll scopes tenant mappings plus global templates', async () => {
    await service.findAll(tenantUser, { protocol: 'modbus' });
    expect(qb.where).toHaveBeenCalledWith(
      '(m.tenant_id = :tenantId OR m.tenant_id IS NULL)',
      { tenantId: 't-1' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('m.protocol = :protocol', { protocol: 'modbus' });
  });

  it('create assigns tenantId for tenant admin', async () => {
    await service.create(tenantUser, {
      protocol: 'modbus',
      deviceProfile: 'pac1670',
      registerKey: '40001',
      targetField: 'power_kw',
      scaleFactor: 0.001,
    });
    expect(mappingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't-1' }),
    );
  });

  it('create global template requires super_admin', async () => {
    await expect(
      service.create(tenantUser, {
        protocol: 'modbus',
        deviceProfile: 'pac1670',
        registerKey: '40001',
        targetField: 'power_kw',
        scaleFactor: 1,
        isGlobalTemplate: true,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('create global template allowed for super_admin', async () => {
    await service.create(superAdmin, {
      protocol: 'modbus',
      deviceProfile: 'pac1670',
      registerKey: '40001',
      targetField: 'power_kw',
      scaleFactor: 1,
      isGlobalTemplate: true,
    });
    expect(mappingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: null }),
    );
  });

  it('exportCsv includes header and rows', async () => {
    qb.getMany.mockResolvedValue([
      {
        tenantId: 't-1',
        protocol: 'modbus',
        deviceProfile: 'pac1670',
        registerKey: '40001',
        targetField: 'power_kw',
        scaleFactor: '0.001000',
        unit: 'kW',
      },
    ]);

    const buffer = await service.exportCsv(tenantUser, {});
    const text = buffer.toString('utf8');
    expect(text).toContain('tenant_id,protocol,device_profile');
    expect(text).toContain('pac1670');
    expect(text).toContain('power_kw');
  });
});
