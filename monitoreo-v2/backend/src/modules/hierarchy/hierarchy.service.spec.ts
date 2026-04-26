import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { Building } from '../platform/entities/building.entity';
import { BuildingHierarchy } from '../platform/entities/building-hierarchy.entity';
import { MeterHierarchy } from '../platform/entities/meter-hierarchy.entity';

const TENANT_ID = 'tenant-1';
const BUILDING_ID = 'building-1';

const mockNode = (overrides: Partial<BuildingHierarchy> = {}): BuildingHierarchy => ({
  id: 'node-1',
  tenantId: TENANT_ID,
  buildingId: BUILDING_ID,
  parentId: null,
  name: 'Piso 1',
  levelType: 'floor',
  sortOrder: 0,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {} as any,
  building: {} as any,
  parent: null,
  children: [],
  ...overrides,
});

describe('HierarchyService', () => {
  let service: HierarchyService;
  let repo: Record<string, jest.Mock>;
  let mhRepo: Record<string, jest.Mock>;
  let buildingRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };

    mhRepo = {
      createQueryBuilder: jest.fn(),
    };

    buildingRepo = {
      findOneBy: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        HierarchyService,
        { provide: getRepositoryToken(Building), useValue: buildingRepo },
        { provide: getRepositoryToken(BuildingHierarchy), useValue: repo },
        { provide: getRepositoryToken(MeterHierarchy), useValue: mhRepo },
      ],
    }).compile();

    service = module.get(HierarchyService);
  });

  describe('findByBuilding', () => {
    it('returns nodes for tenant and building without scoping when buildingIds is empty', async () => {
      const nodes = [mockNode()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(nodes),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByBuilding(TENANT_ID, BUILDING_ID, []);

      expect(qb.where).toHaveBeenCalledWith('h.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(qb.andWhere).toHaveBeenCalledWith('h.building_id = :buildingId', { buildingId: BUILDING_ID });
      expect(result).toEqual(nodes);
    });

    it('scopes by buildingIds when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findByBuilding(TENANT_ID, BUILDING_ID, ['b-1', 'b-2']);

      expect(qb.andWhere).toHaveBeenCalledWith('h.building_id IN (:...buildingIds)', { buildingIds: ['b-1', 'b-2'] });
    });
  });

  describe('findOne', () => {
    it('returns node when found', async () => {
      const node = mockNode();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(node),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('node-1', TENANT_ID, []);
      expect(result).toEqual(node);
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

  describe('findMetersByNode', () => {
    it('returns meter hierarchy entries for a node', async () => {
      const entries = [{ meterId: 'm-1', hierarchyNodeId: 'node-1', meter: {} }];
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(entries),
      };
      mhRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMetersByNode('node-1', TENANT_ID);

      expect(qb.where).toHaveBeenCalledWith('mh.hierarchy_node_id = :hierarchyNodeId', { hierarchyNodeId: 'node-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('node.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(result).toEqual(entries);
    });
  });

  describe('create', () => {
    it('creates a hierarchy node when building belongs to tenant', async () => {
      buildingRepo.findOneBy.mockResolvedValue({ id: BUILDING_ID, tenantId: TENANT_ID });
      const node = mockNode();
      repo.create.mockReturnValue(node);
      repo.save.mockResolvedValue(node);

      const result = await service.create(TENANT_ID, {
        buildingId: BUILDING_ID,
        name: 'Piso 1',
        levelType: 'floor',
      });

      expect(buildingRepo.findOneBy).toHaveBeenCalledWith({ id: BUILDING_ID, tenantId: TENANT_ID });
      expect(repo.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        buildingId: BUILDING_ID,
        parentId: null,
        name: 'Piso 1',
        levelType: 'floor',
        sortOrder: 0,
        metadata: {},
      });
      expect(result).toEqual(node);
    });

    it('throws BadRequestException when building does not belong to tenant', async () => {
      buildingRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, { buildingId: 'foreign-building', name: 'Hack', levelType: 'floor' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates and returns node when found', async () => {
      const node = mockNode();
      repo.findOneBy.mockResolvedValue({ ...node });
      repo.save.mockImplementation((n) => Promise.resolve(n));

      const result = await service.update('node-1', TENANT_ID, { name: 'Piso 2' });

      expect(result?.name).toBe('Piso 2');
    });

    it('returns null when node not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('missing', TENANT_ID, { name: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('node-1', TENANT_ID)).toBe(true);
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

    it('findByBuilding scopes to tenant — tenant B cannot see tenant A hierarchy', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findByBuilding(TENANT_B, 'b-a', []);

      expect(qb.where).toHaveBeenCalledWith('h.tenant_id = :tenantId', { tenantId: TENANT_B });
    });

    it('findOne enforces tenant — tenant B cannot access tenant A node', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('node-a', TENANT_B, []);

      expect(qb.andWhere).toHaveBeenCalledWith('h.tenant_id = :tenantId', { tenantId: TENANT_B });
      expect(result).toBeNull();
    });

    it('create rejects building from another tenant', async () => {
      buildingRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.create(TENANT_B, { buildingId: 'building-of-a', name: 'Hacked', levelType: 'floor' }),
      ).rejects.toThrow(BadRequestException);

      expect(buildingRepo.findOneBy).toHaveBeenCalledWith({ id: 'building-of-a', tenantId: TENANT_B });
    });

    it('update enforces tenant — tenant B cannot update tenant A node', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('node-a', TENANT_B, { name: 'Hacked' });

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'node-a', tenantId: TENANT_B });
      expect(result).toBeNull();
    });

    it('remove enforces tenant — tenant B cannot delete tenant A node', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      const result = await service.remove('node-a', TENANT_B);

      expect(repo.delete).toHaveBeenCalledWith({ id: 'node-a', tenantId: TENANT_B });
      expect(result).toBe(false);
    });

    it('findMetersByNode enforces tenant — tenant B cannot see tenant A node meters', async () => {
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mhRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findMetersByNode('node-a', TENANT_B);

      expect(qb.andWhere).toHaveBeenCalledWith('node.tenant_id = :tenantId', { tenantId: TENANT_B });
    });
  });
});
