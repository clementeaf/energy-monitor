import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BuildingsService } from './buildings.service';
import { Building } from '../platform/entities/building.entity';

const TENANT_ID = 'tenant-1';

const mockBuilding = (overrides: Partial<Building> = {}): Building => ({
  id: 'b-1',
  tenantId: TENANT_ID,
  name: 'Edificio Central',
  code: 'EC',
  address: 'Calle 1',
  areaSqm: '1200.00',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {} as any,
  ...overrides,
});

describe('BuildingsService', () => {
  let service: BuildingsService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        BuildingsService,
        { provide: getRepositoryToken(Building), useValue: repo },
      ],
    }).compile();

    service = module.get(BuildingsService);
  });

  describe('findAll', () => {
    it('returns buildings for tenant without scoping when buildingIds is empty', async () => {
      const buildings = [mockBuilding()];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(buildings),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_ID, []);

      expect(qb.where).toHaveBeenCalledWith('b.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(buildings);
    });

    it('scopes by buildingIds when provided', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['b-1', 'b-2']);

      expect(qb.andWhere).toHaveBeenCalledWith('b.id IN (:...buildingIds)', { buildingIds: ['b-1', 'b-2'] });
    });
  });

  describe('findOne', () => {
    it('returns building when found', async () => {
      const building = mockBuilding();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(building),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('b-1', TENANT_ID, []);
      expect(result).toEqual(building);
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
    it('creates a building with tenant scoping', async () => {
      const building = mockBuilding();
      repo.create.mockReturnValue(building);
      repo.save.mockResolvedValue(building);

      const result = await service.create(TENANT_ID, { name: 'Edificio Central', code: 'EC' });

      expect(repo.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        name: 'Edificio Central',
        code: 'EC',
        address: null,
        areaSqm: null,
      });
      expect(result).toEqual(building);
    });
  });

  describe('update', () => {
    it('updates and returns building when found', async () => {
      const building = mockBuilding();
      repo.findOneBy.mockResolvedValue({ ...building });
      repo.save.mockImplementation((b) => Promise.resolve(b));

      const result = await service.update('b-1', TENANT_ID, { name: 'Nuevo Nombre' });

      expect(result?.name).toBe('Nuevo Nombre');
    });

    it('returns null when building not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('missing', TENANT_ID, { name: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('b-1', TENANT_ID)).toBe(true);
    });

    it('returns false when not found', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      expect(await service.remove('missing', TENANT_ID)).toBe(false);
    });
  });

  /* ------ Tenant isolation ------ */

  describe('tenant isolation', () => {
    const TENANT_A = 'tenant-a';
    const TENANT_B = 'tenant-b';

    it('create assigns building to the given tenant', async () => {
      const building = mockBuilding({ tenantId: TENANT_A });
      repo.create.mockReturnValue(building);
      repo.save.mockResolvedValue(building);

      const result = await service.create(TENANT_A, { name: 'Mall A', code: 'MA' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_A }),
      );
      expect(result.tenantId).toBe(TENANT_A);
    });

    it('findAll scopes to tenant — tenant B cannot see tenant A buildings', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_B, []);

      expect(qb.where).toHaveBeenCalledWith('b.tenant_id = :tenantId', { tenantId: TENANT_B });
    });

    it('findAll cross-tenant mode skips tenant filter', async () => {
      const allBuildings = [
        mockBuilding({ id: 'b-a', tenantId: TENANT_A }),
        mockBuilding({ id: 'b-b', tenantId: TENANT_B }),
      ];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(allBuildings),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_A, [], true);

      expect(qb.where).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('findOne enforces tenant scoping — tenant B cannot access tenant A building', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('b-a', TENANT_B, []);

      expect(qb.where).toHaveBeenCalledWith('b.id = :id', { id: 'b-a' });
      expect(qb.andWhere).toHaveBeenCalledWith('b.tenant_id = :tenantId', { tenantId: TENANT_B });
      expect(result).toBeNull();
    });

    it('update enforces tenant scoping — tenant B cannot update tenant A building', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('b-a', TENANT_B, { name: 'Hacked' });

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'b-a', tenantId: TENANT_B });
      expect(result).toBeNull();
    });

    it('remove enforces tenant scoping — tenant B cannot delete tenant A building', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      const result = await service.remove('b-a', TENANT_B);

      expect(repo.delete).toHaveBeenCalledWith({ id: 'b-a', tenantId: TENANT_B });
      expect(result).toBe(false);
    });
  });
});
