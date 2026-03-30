import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertRulesService } from './alert-rules.service';
import { AlertRule } from '../platform/entities/alert-rule.entity';

const TENANT_ID = 'tenant-1';

const mockRule = (overrides: Partial<AlertRule> = {}): AlertRule => ({
  id: 'rule-1',
  tenantId: TENANT_ID,
  buildingId: null,
  alertTypeCode: 'METER_OFFLINE',
  name: 'Medidor fuera de linea',
  description: null,
  severity: 'high',
  isActive: true,
  checkIntervalSeconds: 900,
  config: {},
  escalationL1Minutes: 0,
  escalationL2Minutes: 60,
  escalationL3Minutes: 1440,
  notifyEmail: true,
  notifyPush: false,
  notifyWhatsapp: false,
  notifySms: false,
  createdBy: null,
  createdByUser: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {} as any,
  building: null,
  ...overrides,
});

describe('AlertRulesService', () => {
  let service: AlertRulesService;
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
        AlertRulesService,
        { provide: getRepositoryToken(AlertRule), useValue: repo },
      ],
    }).compile();

    service = module.get(AlertRulesService);
  });

  describe('findAll', () => {
    it('returns rules for tenant without scoping when buildingIds is empty', async () => {
      const rules = [mockRule()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(rules),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_ID, []);

      expect(qb.where).toHaveBeenCalledWith('r.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(rules);
    });

    it('scopes by buildingIds when provided (includes global rules with null building)', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['b-1', 'b-2']);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(r.building_id IN (:...buildingIds) OR r.building_id IS NULL)',
        { buildingIds: ['b-1', 'b-2'] },
      );
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

      expect(qb.andWhere).toHaveBeenCalledWith('r.building_id = :filterBuildingId', { filterBuildingId: 'b-1' });
    });
  });

  describe('findOne', () => {
    it('returns rule when found', async () => {
      const rule = mockRule();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(rule),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('rule-1', TENANT_ID, []);
      expect(result).toEqual(rule);
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

    it('scopes by buildingIds including global rules', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findOne('rule-1', TENANT_ID, ['b-1']);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(r.building_id IN (:...buildingIds) OR r.building_id IS NULL)',
        { buildingIds: ['b-1'] },
      );
    });
  });

  describe('create', () => {
    it('creates a rule with tenant scoping and defaults', async () => {
      const rule = mockRule();
      repo.create.mockReturnValue(rule);
      repo.save.mockResolvedValue(rule);

      const result = await service.create(TENANT_ID, {
        alertTypeCode: 'METER_OFFLINE',
        name: 'Medidor fuera de linea',
        severity: 'high',
      });

      expect(repo.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        alertTypeCode: 'METER_OFFLINE',
        name: 'Medidor fuera de linea',
        description: null,
        severity: 'high',
        buildingId: null,
        isActive: true,
        checkIntervalSeconds: 900,
        config: {},
        escalationL1Minutes: 0,
        escalationL2Minutes: 60,
        escalationL3Minutes: 1440,
        notifyEmail: true,
        notifyPush: false,
        notifyWhatsapp: false,
        notifySms: false,
        createdBy: null,
      });
      expect(result).toEqual(rule);
    });

    it('passes createdBy when provided', async () => {
      const rule = mockRule({ createdBy: 'u-1' });
      repo.create.mockReturnValue(rule);
      repo.save.mockResolvedValue(rule);

      await service.create(TENANT_ID, {
        alertTypeCode: 'METER_OFFLINE',
        name: 'Test',
        severity: 'low',
      }, 'u-1');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'u-1' }),
      );
    });
  });

  describe('update', () => {
    it('updates and returns rule when found', async () => {
      const rule = mockRule();
      repo.findOneBy.mockResolvedValue({ ...rule });
      repo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.update('rule-1', TENANT_ID, { name: 'Nuevo Nombre', severity: 'critical' });

      expect(result?.name).toBe('Nuevo Nombre');
      expect(result?.severity).toBe('critical');
    });

    it('returns null when rule not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('missing', TENANT_ID, { name: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('rule-1', TENANT_ID)).toBe(true);
    });

    it('returns false when not found', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      expect(await service.remove('missing', TENANT_ID)).toBe(false);
    });
  });
});
