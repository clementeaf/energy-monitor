import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConcentratorsService } from './concentrators.service';
import { Concentrator } from '../platform/entities/concentrator.entity';
import { ConcentratorMeter } from '../platform/entities/concentrator-meter.entity';

const TENANT_ID = 'tenant-1';

const mockConcentrator = (overrides: Partial<Concentrator> = {}): Concentrator => ({
  id: 'c-1',
  tenantId: TENANT_ID,
  buildingId: 'b-1',
  name: 'Concentrador A',
  model: 'Model X',
  serialNumber: 'SN001',
  ipAddress: '192.168.1.1',
  firmwareVersion: '1.0.0',
  status: 'online',
  lastHeartbeatAt: null,
  mqttConnected: false,
  batteryLevel: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {} as any,
  building: {} as any,
  ...overrides,
});

const mockConcentratorMeter = (overrides: Partial<ConcentratorMeter> = {}): ConcentratorMeter => ({
  concentratorId: 'c-1',
  meterId: 'm-1',
  busNumber: 1,
  modbusAddress: null,
  concentrator: {} as any,
  meter: {} as any,
  ...overrides,
});

describe('ConcentratorsService', () => {
  let service: ConcentratorsService;
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
        ConcentratorsService,
        { provide: getRepositoryToken(Concentrator), useValue: repo },
        { provide: getRepositoryToken(ConcentratorMeter), useValue: meterRepo },
      ],
    }).compile();

    service = module.get(ConcentratorsService);
  });

  describe('findAll', () => {
    it('returns concentrators for tenant without scoping when buildingIds is empty', async () => {
      const items = [mockConcentrator()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(items),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_ID, []);

      expect(qb.where).toHaveBeenCalledWith('c.tenant_id = :tenantId', { tenantId: TENANT_ID });
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

      expect(qb.andWhere).toHaveBeenCalledWith('c.building_id IN (:...buildingIds)', { buildingIds: ['b-1', 'b-2'] });
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

      expect(qb.andWhere).toHaveBeenCalledWith('c.building_id = :buildingId', { buildingId: 'b-1' });
    });
  });

  describe('findOne', () => {
    it('returns concentrator when found', async () => {
      const item = mockConcentrator();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(item),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('c-1', TENANT_ID, []);
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
    it('creates a concentrator with tenant scoping', async () => {
      const item = mockConcentrator();
      repo.create.mockReturnValue(item);
      repo.save.mockResolvedValue(item);

      const result = await service.create(TENANT_ID, {
        buildingId: 'b-1',
        name: 'Concentrador A',
        model: 'Model X',
      });

      expect(repo.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        buildingId: 'b-1',
        name: 'Concentrador A',
        model: 'Model X',
        serialNumber: null,
        ipAddress: null,
        firmwareVersion: null,
        status: 'online',
        metadata: {},
      });
      expect(result).toEqual(item);
    });
  });

  describe('update', () => {
    it('updates and returns concentrator when found', async () => {
      const item = mockConcentrator();
      repo.findOneBy.mockResolvedValue({ ...item });
      repo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.update('c-1', TENANT_ID, { name: 'Nuevo Nombre' });

      expect(result?.name).toBe('Nuevo Nombre');
    });

    it('returns null when concentrator not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('missing', TENANT_ID, { name: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('c-1', TENANT_ID)).toBe(true);
    });

    it('returns false when not found', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      expect(await service.remove('missing', TENANT_ID)).toBe(false);
    });
  });

  describe('findMeters', () => {
    it('returns meters when concentrator exists', async () => {
      const meters = [mockConcentratorMeter()];
      repo.findOneBy.mockResolvedValue(mockConcentrator());
      meterRepo.findBy.mockResolvedValue(meters);

      const result = await service.findMeters('c-1', TENANT_ID);
      expect(result).toEqual(meters);
    });

    it('returns empty array when concentrator not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.findMeters('missing', TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  describe('addMeter', () => {
    it('adds meter when concentrator exists', async () => {
      const entry = mockConcentratorMeter();
      repo.findOneBy.mockResolvedValue(mockConcentrator());
      meterRepo.create.mockReturnValue(entry);
      meterRepo.save.mockResolvedValue(entry);

      const result = await service.addMeter('c-1', { meterId: 'm-1' }, TENANT_ID);

      expect(meterRepo.create).toHaveBeenCalledWith({
        concentratorId: 'c-1',
        meterId: 'm-1',
        busNumber: 1,
        modbusAddress: null,
      });
      expect(result).toEqual(entry);
    });

    it('returns null when concentrator not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.addMeter('missing', { meterId: 'm-1' }, TENANT_ID);
      expect(result).toBeNull();
    });
  });

  describe('removeMeter', () => {
    it('removes meter when concentrator exists', async () => {
      repo.findOneBy.mockResolvedValue(mockConcentrator());
      meterRepo.delete.mockResolvedValue({ affected: 1 });

      expect(await service.removeMeter('c-1', 'm-1', TENANT_ID)).toBe(true);
    });

    it('returns false when concentrator not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      expect(await service.removeMeter('missing', 'm-1', TENANT_ID)).toBe(false);
    });

    it('returns false when meter link not found', async () => {
      repo.findOneBy.mockResolvedValue(mockConcentrator());
      meterRepo.delete.mockResolvedValue({ affected: 0 });

      expect(await service.removeMeter('c-1', 'missing', TENANT_ID)).toBe(false);
    });
  });
});
