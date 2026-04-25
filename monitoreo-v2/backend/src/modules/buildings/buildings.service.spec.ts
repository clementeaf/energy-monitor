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
});
