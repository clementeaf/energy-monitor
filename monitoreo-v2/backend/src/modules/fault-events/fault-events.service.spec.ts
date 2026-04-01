import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FaultEventsService } from './fault-events.service';
import { FaultEvent } from '../platform/entities/fault-event.entity';

const TENANT_ID = 'tenant-1';

const mockEvent = (overrides: Partial<FaultEvent> = {}): FaultEvent => ({
  id: 'fe-1',
  tenantId: TENANT_ID,
  buildingId: 'b-1',
  meterId: null,
  concentratorId: null,
  faultType: 'voltage_anomaly',
  severity: 'high',
  description: 'Voltage spike detected',
  startedAt: new Date(),
  resolvedAt: null,
  resolvedBy: null,
  resolutionNotes: null,
  createdAt: new Date(),
  tenant: {} as any,
  building: {} as any,
  meter: null,
  concentrator: null,
  resolvedByUser: null,
  ...overrides,
});

describe('FaultEventsService', () => {
  let service: FaultEventsService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        FaultEventsService,
        { provide: getRepositoryToken(FaultEvent), useValue: repo },
      ],
    }).compile();

    service = module.get(FaultEventsService);
  });

  describe('findAll', () => {
    it('returns events for tenant without scoping when buildingIds is empty', async () => {
      const events = [mockEvent()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(events),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(TENANT_ID, [], {});

      expect(qb.where).toHaveBeenCalledWith('fe.tenant_id = :tenantId', { tenantId: TENANT_ID });
      expect(result).toEqual(events);
    });

    it('scopes by buildingIds when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, ['b-1', 'b-2'], {});

      expect(qb.andWhere).toHaveBeenCalledWith('fe.building_id IN (:...buildingIds)', { buildingIds: ['b-1', 'b-2'] });
    });

    it('applies all filters when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(TENANT_ID, [], {
        buildingId: 'b-1',
        meterId: 'm-1',
        severity: 'high',
        faultType: 'voltage_anomaly',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('fe.building_id = :buildingId', { buildingId: 'b-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('fe.meter_id = :meterId', { meterId: 'm-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('fe.severity = :severity', { severity: 'high' });
      expect(qb.andWhere).toHaveBeenCalledWith('fe.fault_type = :faultType', { faultType: 'voltage_anomaly' });
      expect(qb.andWhere).toHaveBeenCalledWith('fe.started_at >= :dateFrom', { dateFrom: '2026-01-01' });
      expect(qb.andWhere).toHaveBeenCalledWith('fe.started_at <= :dateTo', { dateTo: '2026-12-31' });
    });
  });

  describe('findOne', () => {
    it('returns event when found', async () => {
      const event = mockEvent();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(event),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('fe-1', TENANT_ID, []);
      expect(result).toEqual(event);
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

      await service.findOne('fe-1', TENANT_ID, ['b-1']);

      expect(qb.andWhere).toHaveBeenCalledWith('fe.building_id IN (:...buildingIds)', { buildingIds: ['b-1'] });
    });
  });
});
