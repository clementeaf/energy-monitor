import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetersService } from './meters.service';
import { Meter } from '../platform/entities/meter.entity';

const TENANT_ID = 'tenant-1';
const BUILDING_ID = 'bld-1';

const mockMeter = (overrides: Partial<Meter> = {}): Meter => ({
  id: 'm-1',
  tenantId: TENANT_ID,
  buildingId: BUILDING_ID,
  name: 'Medidor Principal',
  code: 'MP-001',
  meterType: 'electrical',
  isActive: true,
  metadata: {},
  externalId: null,
  model: null,
  serialNumber: null,
  ipAddress: null,
  modbusAddress: null,
  busId: null,
  phaseType: 'three_phase',
  diStatus: 'closed',
  doStatus: 'inactive',
  uplinkRoute: null,
  crcErrorsLastPoll: 0,
  nominalVoltage: null,
  nominalCurrent: null,
  contractedDemandKw: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {} as any,
  building: {} as any,
  ...overrides,
});

describe('MetersService', () => {
  let service: MetersService;
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
        MetersService,
        { provide: getRepositoryToken(Meter), useValue: repo },
      ],
    }).compile();

    service = module.get(MetersService);
  });

  describe('findAll', () => {
    it('returns meters for tenant without scoping when buildingIds is empty', async () => {
      const meters = [mockMeter()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(meters),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_ID, []);

      expect(qb.where).toHaveBeenCalledWith('m.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(meters);
    });

    it('scopes by buildingIds when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['bld-1', 'bld-2']);

      expect(qb.andWhere).toHaveBeenCalledWith('m.building_id IN (:...buildingIds)', {
        buildingIds: ['bld-1', 'bld-2'],
      });
    });

    it('filters by specific buildingId when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, [], 'bld-1');

      expect(qb.andWhere).toHaveBeenCalledWith('m.building_id = :filterBuildingId', {
        filterBuildingId: 'bld-1',
      });
    });

    it('applies both buildingIds scope and filter', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['bld-1', 'bld-2'], 'bld-1');

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it('returns meter when found', async () => {
      const meter = mockMeter();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(meter),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('m-1', TENANT_ID, []);
      expect(result).toEqual(meter);
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

    it('scopes by buildingIds when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findOne('m-1', TENANT_ID, ['bld-1']);

      expect(qb.andWhere).toHaveBeenCalledWith('m.building_id IN (:...buildingIds)', {
        buildingIds: ['bld-1'],
      });
    });
  });

  describe('create', () => {
    it('creates a meter with required fields', async () => {
      const meter = mockMeter();
      repo.create.mockReturnValue(meter);
      repo.save.mockResolvedValue(meter);

      const result = await service.create(TENANT_ID, {
        buildingId: BUILDING_ID,
        name: 'Medidor Principal',
        code: 'MP-001',
      });

      expect(repo.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        buildingId: BUILDING_ID,
        name: 'Medidor Principal',
        code: 'MP-001',
        meterType: 'electrical',
        isActive: true,
        metadata: {},
        externalId: null,
        model: null,
        serialNumber: null,
        ipAddress: null,
        modbusAddress: null,
        busId: null,
        phaseType: 'three_phase',
        uplinkRoute: null,
        nominalVoltage: null,
        nominalCurrent: null,
        contractedDemandKw: null,
      });
      expect(result).toEqual(meter);
    });

    it('creates a meter with optional fields', async () => {
      const meter = mockMeter({ nominalVoltage: '220.00' });
      repo.create.mockReturnValue(meter);
      repo.save.mockResolvedValue(meter);

      await service.create(TENANT_ID, {
        buildingId: BUILDING_ID,
        name: 'Medidor Principal',
        code: 'MP-001',
        meterType: 'water',
        phaseType: 'single_phase',
        nominalVoltage: 220,
        contractedDemandKw: 50,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meterType: 'water',
          phaseType: 'single_phase',
          nominalVoltage: '220',
          contractedDemandKw: '50',
        }),
      );
    });
  });

  describe('update', () => {
    it('updates and returns meter when found', async () => {
      const meter = mockMeter();
      repo.findOneBy.mockResolvedValue({ ...meter });
      repo.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.update('m-1', TENANT_ID, { name: 'Nuevo Nombre' });

      expect(result?.name).toBe('Nuevo Nombre');
    });

    it('returns null when meter not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('missing', TENANT_ID, { name: 'X' });
      expect(result).toBeNull();
    });

    it('updates decimal fields as strings', async () => {
      const meter = mockMeter();
      repo.findOneBy.mockResolvedValue({ ...meter });
      repo.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.update('m-1', TENANT_ID, {
        nominalVoltage: 380,
        nominalCurrent: 100,
      });

      expect(result?.nominalVoltage).toBe('380');
      expect(result?.nominalCurrent).toBe('100');
    });

    it('clears nullable fields when set to undefined value', async () => {
      const meter = mockMeter({ model: 'ABC', serialNumber: '123' });
      repo.findOneBy.mockResolvedValue({ ...meter });
      repo.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.update('m-1', TENANT_ID, {
        model: undefined,
      });

      // model should not change because undefined means "not provided"
      expect(result?.model).toBe('ABC');
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('m-1', TENANT_ID)).toBe(true);
    });

    it('returns false when not found', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      expect(await service.remove('missing', TENANT_ID)).toBe(false);
    });
  });
});
