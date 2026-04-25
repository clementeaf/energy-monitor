import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { PlatformAlert } from '../platform/entities/platform-alert.entity';

const TENANT_ID = 'tenant-1';

const mockAlert = (overrides: Partial<PlatformAlert> = {}): PlatformAlert => ({
  id: 'alert-1',
  tenantId: TENANT_ID,
  alertRuleId: null,
  alertRule: null,
  buildingId: 'b-1',
  meterId: 'm-1',
  alertTypeCode: 'METER_OFFLINE',
  severity: 'high',
  status: 'active',
  message: 'Medidor MG-001 sin datos hace 30 min',
  triggeredValue: null,
  thresholdValue: null,
  assignedTo: null,
  assignedToUser: null,
  acknowledgedBy: null,
  acknowledgedByUser: null,
  acknowledgedAt: null,
  resolvedBy: null,
  resolvedByUser: null,
  resolvedAt: null,
  resolutionNotes: null,
  createdAt: new Date(),
  tenant: {} as any,
  building: {} as any,
  meter: null,
  ...overrides,
});

describe('AlertsService', () => {
  let service: AlertsService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(PlatformAlert), useValue: repo },
      ],
    }).compile();

    service = module.get(AlertsService);
  });

  const makeQb = (result: unknown = []) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(Array.isArray(result) ? result : [result]),
    getOne: jest.fn().mockResolvedValue(Array.isArray(result) ? result[0] ?? null : result),
  });

  describe('findAll', () => {
    it('returns alerts for tenant without scoping when buildingIds is empty', async () => {
      const alerts = [mockAlert()];
      const qb = makeQb(alerts);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_ID, [], {});

      expect(qb.where).toHaveBeenCalledWith('a.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(alerts);
    });

    it('scopes by buildingIds when provided', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['b-1', 'b-2'], {});

      expect(qb.andWhere).toHaveBeenCalledWith(
        'a.building_id IN (:...buildingIds)',
        { buildingIds: ['b-1', 'b-2'] },
      );
    });

    it('filters by status', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, [], { status: 'active' });

      expect(qb.andWhere).toHaveBeenCalledWith('a.status = :status', { status: 'active' });
    });

    it('filters by severity', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, [], { severity: 'critical' });

      expect(qb.andWhere).toHaveBeenCalledWith('a.severity = :severity', { severity: 'critical' });
    });

    it('filters by buildingId', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, [], { buildingId: 'b-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('a.building_id = :buildingId', { buildingId: 'b-1' });
    });

    it('filters by meterId', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, [], { meterId: 'm-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('a.meter_id = :meterId', { meterId: 'm-1' });
    });

    it('applies multiple filters simultaneously', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['b-1'], { status: 'active', severity: 'high' });

      expect(qb.andWhere).toHaveBeenCalledTimes(3); // buildingIds + status + severity
    });
  });

  describe('findOne', () => {
    it('returns alert when found', async () => {
      const alert = mockAlert();
      const qb = makeQb(alert);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('alert-1', TENANT_ID, []);
      expect(result).toEqual(alert);
    });

    it('returns null when not found', async () => {
      const qb = makeQb(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('missing', TENANT_ID, []);
      expect(result).toBeNull();
    });

    it('scopes by buildingIds', async () => {
      const qb = makeQb(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findOne('alert-1', TENANT_ID, ['b-1']);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'a.building_id IN (:...buildingIds)',
        { buildingIds: ['b-1'] },
      );
    });
  });

  describe('acknowledge', () => {
    it('marks alert as acknowledged with user and timestamp', async () => {
      const alert = mockAlert();
      const qb = makeQb(alert);
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.acknowledge('alert-1', TENANT_ID, [], 'u-1');

      expect(result?.status).toBe('acknowledged');
      expect(result?.acknowledgedBy).toBe('u-1');
      expect(result?.acknowledgedAt).toBeInstanceOf(Date);
    });

    it('returns null when alert not found', async () => {
      const qb = makeQb(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.acknowledge('missing', TENANT_ID, [], 'u-1');
      expect(result).toBeNull();
    });
  });

  describe('resolve', () => {
    it('marks alert as resolved with user, timestamp and notes', async () => {
      const alert = mockAlert();
      const qb = makeQb(alert);
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.resolve('alert-1', TENANT_ID, [], 'u-1', 'Reinicio de equipo');

      expect(result?.status).toBe('resolved');
      expect(result?.resolvedBy).toBe('u-1');
      expect(result?.resolvedAt).toBeInstanceOf(Date);
      expect(result?.resolutionNotes).toBe('Reinicio de equipo');
    });

    it('sets resolutionNotes to null when not provided', async () => {
      const alert = mockAlert();
      const qb = makeQb(alert);
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.resolve('alert-1', TENANT_ID, [], 'u-1');

      expect(result?.resolutionNotes).toBeNull();
    });

    it('returns null when alert not found', async () => {
      const qb = makeQb(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve('missing', TENANT_ID, [], 'u-1');
      expect(result).toBeNull();
    });
  });
});
