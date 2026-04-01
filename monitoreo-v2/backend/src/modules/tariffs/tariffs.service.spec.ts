import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TariffsService } from './tariffs.service';
import { Tariff } from '../platform/entities/tariff.entity';
import { TariffBlock } from '../platform/entities/tariff-block.entity';

const TENANT_ID = 'tenant-1';

const mockTariff = (overrides: Partial<Tariff> = {}): Tariff => ({
  id: 'tar-1',
  tenantId: TENANT_ID,
  buildingId: 'b-1',
  name: 'Tarifa Verano',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  isActive: true,
  createdBy: 'u-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {} as any,
  building: {} as any,
  createdByUser: null,
  ...overrides,
});

const mockBlock = (overrides: Partial<TariffBlock> = {}): TariffBlock => ({
  id: 'blk-1',
  tariffId: 'tar-1',
  blockName: 'Punta',
  hourStart: 18,
  hourEnd: 23,
  energyRate: '120.5000',
  demandRate: '50.0000',
  reactiveRate: '10.0000',
  fixedCharge: '5000.00',
  tariff: {} as any,
  ...overrides,
});

describe('TariffsService', () => {
  let service: TariffsService;
  let tariffRepo: Record<string, jest.Mock>;
  let blockRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    tariffRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };

    blockRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TariffsService,
        { provide: getRepositoryToken(Tariff), useValue: tariffRepo },
        { provide: getRepositoryToken(TariffBlock), useValue: blockRepo },
      ],
    }).compile();

    service = module.get(TariffsService);
  });

  describe('findAll', () => {
    it('returns tariffs for tenant without scoping when buildingIds is empty', async () => {
      const tariffs = [mockTariff()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(tariffs),
      };
      tariffRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_ID, []);

      expect(qb.where).toHaveBeenCalledWith('t.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(tariffs);
    });

    it('scopes by buildingIds when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      tariffRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['b-1', 'b-2']);

      expect(qb.andWhere).toHaveBeenCalledWith('t.building_id IN (:...buildingIds)', { buildingIds: ['b-1', 'b-2'] });
    });

    it('filters by buildingId when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      tariffRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, [], 'b-1');

      expect(qb.andWhere).toHaveBeenCalledWith('t.building_id = :buildingId', { buildingId: 'b-1' });
    });
  });

  describe('findOne', () => {
    it('returns tariff when found', async () => {
      const tariff = mockTariff();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(tariff),
      };
      tariffRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('tar-1', TENANT_ID, []);
      expect(result).toEqual(tariff);
    });

    it('returns null when not found', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      tariffRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('missing', TENANT_ID, []);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a tariff with tenant scoping and createdBy', async () => {
      const tariff = mockTariff();
      tariffRepo.create.mockReturnValue(tariff);
      tariffRepo.save.mockResolvedValue(tariff);

      const result = await service.create(TENANT_ID, 'u-1', {
        buildingId: 'b-1',
        name: 'Tarifa Verano',
        effectiveFrom: '2026-01-01',
      });

      expect(tariffRepo.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        buildingId: 'b-1',
        name: 'Tarifa Verano',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        isActive: true,
        createdBy: 'u-1',
      });
      expect(result).toEqual(tariff);
    });
  });

  describe('update', () => {
    it('updates and returns tariff when found', async () => {
      const tariff = mockTariff();
      tariffRepo.findOneBy.mockResolvedValue({ ...tariff });
      tariffRepo.save.mockImplementation((t) => Promise.resolve(t));

      const result = await service.update('tar-1', TENANT_ID, { name: 'Tarifa Invierno' });

      expect(result?.name).toBe('Tarifa Invierno');
    });

    it('returns null when tariff not found', async () => {
      tariffRepo.findOneBy.mockResolvedValue(null);

      const result = await service.update('missing', TENANT_ID, { name: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      tariffRepo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('tar-1', TENANT_ID)).toBe(true);
    });

    it('returns false when not found', async () => {
      tariffRepo.delete.mockResolvedValue({ affected: 0 });
      expect(await service.remove('missing', TENANT_ID)).toBe(false);
    });
  });

  describe('findBlocks', () => {
    it('returns blocks when tariff exists', async () => {
      const blocks = [mockBlock()];
      tariffRepo.findOneBy.mockResolvedValue(mockTariff());
      blockRepo.find.mockResolvedValue(blocks);

      const result = await service.findBlocks('tar-1', TENANT_ID);
      expect(result).toEqual(blocks);
    });

    it('returns empty array when tariff not found', async () => {
      tariffRepo.findOneBy.mockResolvedValue(null);

      const result = await service.findBlocks('missing', TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  describe('createBlock', () => {
    it('creates a block for an existing tariff', async () => {
      const block = mockBlock();
      tariffRepo.findOneBy.mockResolvedValue(mockTariff());
      blockRepo.create.mockReturnValue(block);
      blockRepo.save.mockResolvedValue(block);

      const result = await service.createBlock('tar-1', TENANT_ID, {
        blockName: 'Punta',
        hourStart: 18,
        hourEnd: 23,
        energyRate: 120.5,
      });

      expect(blockRepo.create).toHaveBeenCalledWith({
        tariffId: 'tar-1',
        blockName: 'Punta',
        hourStart: 18,
        hourEnd: 23,
        energyRate: '120.5',
        demandRate: '0',
        reactiveRate: '0',
        fixedCharge: '0',
      });
      expect(result).toEqual(block);
    });

    it('returns null when tariff not found', async () => {
      tariffRepo.findOneBy.mockResolvedValue(null);

      const result = await service.createBlock('missing', TENANT_ID, {
        blockName: 'Punta',
        hourStart: 18,
        hourEnd: 23,
        energyRate: 100,
      });
      expect(result).toBeNull();
    });
  });

  describe('removeBlock', () => {
    it('returns true when block deleted', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockBlock()),
      };
      blockRepo.createQueryBuilder.mockReturnValue(qb);
      blockRepo.delete.mockResolvedValue({ affected: 1 });

      expect(await service.removeBlock('blk-1', TENANT_ID)).toBe(true);
    });

    it('returns false when block not found', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      blockRepo.createQueryBuilder.mockReturnValue(qb);

      expect(await service.removeBlock('missing', TENANT_ID)).toBe(false);
    });
  });
});
