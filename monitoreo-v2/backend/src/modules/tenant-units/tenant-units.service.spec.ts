import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantUnitsService } from './tenant-units.service';
import { TenantUnit } from '../platform/entities/tenant-unit.entity';
import { TenantUnitMeter } from '../platform/entities/tenant-unit-meter.entity';

const TENANT_ID = 'tenant-1';

const mockUnit = (overrides: Partial<TenantUnit> = {}): TenantUnit => ({
  id: 'tu-1',
  tenantId: TENANT_ID,
  buildingId: 'b-1',
  name: 'Local 101',
  unitCode: 'L101',
  contactName: 'Juan Pérez',
  contactEmail: 'juan@test.com',
  userId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {} as any,
  building: {} as any,
  linkedUser: null,
  ...overrides,
});

const mockUnitMeter = (overrides: Partial<TenantUnitMeter> = {}): TenantUnitMeter => ({
  tenantUnitId: 'tu-1',
  meterId: 'm-1',
  tenantUnit: {} as any,
  meter: {} as any,
  ...overrides,
});

describe('TenantUnitsService', () => {
  let service: TenantUnitsService;
  let repo: Record<string, jest.Mock>;
  let meterRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };

    meterRepo = {
      findBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TenantUnitsService,
        { provide: getRepositoryToken(TenantUnit), useValue: repo },
        { provide: getRepositoryToken(TenantUnitMeter), useValue: meterRepo },
      ],
    }).compile();

    service = module.get(TenantUnitsService);
  });

  describe('findAll', () => {
    it('returns units for tenant without scoping when buildingIds is empty', async () => {
      const items = [mockUnit()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(items),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_ID, []);

      expect(qb.where).toHaveBeenCalledWith('tu.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(items);
    });

    it('scopes by buildingIds when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['b-1', 'b-2']);

      expect(qb.andWhere).toHaveBeenCalledWith('tu.building_id IN (:...buildingIds)', { buildingIds: ['b-1', 'b-2'] });
    });

    it('filters by buildingId when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, [], 'b-1');

      expect(qb.andWhere).toHaveBeenCalledWith('tu.building_id = :buildingId', { buildingId: 'b-1' });
    });
  });

  describe('findOne', () => {
    it('returns unit when found', async () => {
      const item = mockUnit();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(item),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('tu-1', TENANT_ID, []);
      expect(result).toEqual(item);
    });

    it('returns null when not found', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('missing', TENANT_ID, []);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a tenant unit with tenant scoping', async () => {
      const item = mockUnit();
      repo.create.mockReturnValue(item);
      repo.save.mockResolvedValue(item);

      const result = await service.create(TENANT_ID, {
        buildingId: 'b-1',
        name: 'Local 101',
        unitCode: 'L101',
      });

      expect(repo.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        buildingId: 'b-1',
        name: 'Local 101',
        unitCode: 'L101',
        contactName: null,
        contactEmail: null,
        userId: null,
      });
      expect(result).toEqual(item);
    });
  });

  describe('update', () => {
    it('updates and returns unit when found', async () => {
      const item = mockUnit();
      repo.findOneBy.mockResolvedValue({ ...item });
      repo.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.update('tu-1', TENANT_ID, { name: 'Nuevo Nombre' });

      expect(result?.name).toBe('Nuevo Nombre');
    });

    it('returns null when unit not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('missing', TENANT_ID, { name: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('tu-1', TENANT_ID)).toBe(true);
    });

    it('returns false when not found', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      expect(await service.remove('missing', TENANT_ID)).toBe(false);
    });
  });

  describe('findMeters', () => {
    it('returns meters when unit exists', async () => {
      const meters = [mockUnitMeter()];
      repo.findOneBy.mockResolvedValue(mockUnit());
      meterRepo.findBy.mockResolvedValue(meters);

      const result = await service.findMeters('tu-1', TENANT_ID);
      expect(result).toEqual(meters);
    });

    it('returns empty array when unit not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.findMeters('missing', TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  describe('addMeter', () => {
    it('adds meter when unit exists', async () => {
      const entry = mockUnitMeter();
      repo.findOneBy.mockResolvedValue(mockUnit());
      meterRepo.create.mockReturnValue(entry);
      meterRepo.save.mockResolvedValue(entry);

      const result = await service.addMeter('tu-1', 'm-1', TENANT_ID);

      expect(meterRepo.create).toHaveBeenCalledWith({
        tenantUnitId: 'tu-1',
        meterId: 'm-1',
      });
      expect(result).toEqual(entry);
    });

    it('returns null when unit not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.addMeter('missing', 'm-1', TENANT_ID);
      expect(result).toBeNull();
    });
  });

  describe('removeMeter', () => {
    it('removes meter when unit exists', async () => {
      repo.findOneBy.mockResolvedValue(mockUnit());
      meterRepo.delete.mockResolvedValue({ affected: 1 });

      expect(await service.removeMeter('tu-1', 'm-1', TENANT_ID)).toBe(true);
    });

    it('returns false when unit not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      expect(await service.removeMeter('missing', 'm-1', TENANT_ID)).toBe(false);
    });

    it('returns false when meter link not found', async () => {
      repo.findOneBy.mockResolvedValue(mockUnit());
      meterRepo.delete.mockResolvedValue({ affected: 0 });

      expect(await service.removeMeter('tu-1', 'missing', TENANT_ID)).toBe(false);
    });
  });

  /* ------ Tenant isolation ------ */

  describe('tenant isolation', () => {
    const TENANT_A = 'tenant-a';
    const TENANT_B = 'tenant-b';
    const BUILDING_A = 'building-a';

    it('create assigns tenant unit to the given tenant and building', async () => {
      const unit = mockUnit({ tenantId: TENANT_A, buildingId: BUILDING_A });
      repo.create.mockReturnValue(unit);
      repo.save.mockResolvedValue(unit);

      const result = await service.create(TENANT_A, { buildingId: BUILDING_A, name: 'Tienda X', unitCode: 'TX' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_A, buildingId: BUILDING_A }),
      );
      expect(result.tenantId).toBe(TENANT_A);
      expect(result.buildingId).toBe(BUILDING_A);
    });

    it('findAll scopes to tenant — tenant B cannot see tenant A units', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_B, []);

      expect(qb.where).toHaveBeenCalledWith('tu.tenant_id = :tenantId', { tenantId: TENANT_B });
    });

    it('findOne enforces tenant scoping — tenant B cannot access tenant A unit', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('tu-a', TENANT_B, []);

      expect(qb.andWhere).toHaveBeenCalledWith('tu.tenant_id = :tenantId', { tenantId: TENANT_B });
      expect(result).toBeNull();
    });

    it('update enforces tenant scoping — tenant B cannot update tenant A unit', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('tu-a', TENANT_B, { name: 'Hacked' });

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'tu-a', tenantId: TENANT_B });
      expect(result).toBeNull();
    });

    it('remove enforces tenant scoping — tenant B cannot delete tenant A unit', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      const result = await service.remove('tu-a', TENANT_B);

      expect(repo.delete).toHaveBeenCalledWith({ id: 'tu-a', tenantId: TENANT_B });
      expect(result).toBe(false);
    });

    it('addMeter enforces tenant scoping — tenant B cannot add meter to tenant A unit', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.addMeter('tu-a', 'm-1', TENANT_B);

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'tu-a', tenantId: TENANT_B });
      expect(result).toBeNull();
    });

    it('removeMeter enforces tenant scoping — tenant B cannot remove meter from tenant A unit', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.removeMeter('tu-a', 'm-1', TENANT_B);

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'tu-a', tenantId: TENANT_B });
      expect(result).toBe(false);
    });
  });
});
