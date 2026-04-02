import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AlertEngineService } from './alert-engine.service';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { PlatformAlert } from '../platform/entities/platform-alert.entity';
import { NotificationService } from './notification.service';
import { CommunicationEvaluator } from './evaluators/communication.evaluator';
import { ElectricalEvaluator } from './evaluators/electrical.evaluator';
import { ConsumptionEvaluator } from './evaluators/consumption.evaluator';
import { OperationalEvaluator } from './evaluators/operational.evaluator';
import { GenerationEvaluator } from './evaluators/generation.evaluator';
import { BusEvaluator } from './evaluators/bus.evaluator';

const TENANT_ID = 'tenant-1';

const mockRule = (overrides: Partial<AlertRule> = {}): AlertRule => ({
  id: 'rule-1',
  tenantId: TENANT_ID,
  buildingId: null,
  alertTypeCode: 'METER_OFFLINE',
  name: 'Test Rule',
  description: null,
  severity: 'high',
  isActive: true,
  checkIntervalSeconds: 300,
  config: { offlineMinutes: 30 },
  escalationL1Minutes: 30,
  escalationL2Minutes: 120,
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

describe('AlertEngineService', () => {
  let service: AlertEngineService;
  let rulesRepo: Record<string, jest.Mock>;
  let alertsRepo: Record<string, jest.Mock>;
  let notificationService: Record<string, jest.Mock>;
  let commEvaluator: Record<string, jest.Mock | string[]>;

  beforeEach(async () => {
    rulesRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    alertsRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn((data) => ({ ...data, id: 'new-alert' })),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    notificationService = {
      notify: jest.fn(),
      notifyEscalation: jest.fn(),
    };

    commEvaluator = {
      supportedCodes: ['METER_OFFLINE', 'CONCENTRATOR_OFFLINE', 'COMM_DEGRADED'],
      evaluate: jest.fn().mockResolvedValue([]),
    };

    const emptyEvaluator = (codes: string[]) => ({
      supportedCodes: codes,
      evaluate: jest.fn().mockResolvedValue([]),
    });

    const module = await Test.createTestingModule({
      providers: [
        AlertEngineService,
        { provide: getRepositoryToken(AlertRule), useValue: rulesRepo },
        { provide: getRepositoryToken(PlatformAlert), useValue: alertsRepo },
        { provide: DataSource, useValue: {} },
        { provide: NotificationService, useValue: notificationService },
        { provide: CommunicationEvaluator, useValue: commEvaluator },
        { provide: ElectricalEvaluator, useValue: emptyEvaluator(['VOLTAGE_OUT_OF_RANGE', 'LOW_POWER_FACTOR', 'HIGH_THD', 'PHASE_IMBALANCE', 'FREQUENCY_OUT_OF_RANGE', 'OVERCURRENT', 'BREAKER_TRIP', 'NEUTRAL_FAULT']) },
        { provide: ConsumptionEvaluator, useValue: emptyEvaluator(['ABNORMAL_CONSUMPTION', 'PEAK_DEMAND_EXCEEDED', 'ENERGY_DEVIATION']) },
        { provide: OperationalEvaluator, useValue: emptyEvaluator(['METER_TAMPER', 'CONFIG_CHANGE', 'FIRMWARE_MISMATCH']) },
        { provide: GenerationEvaluator, useValue: emptyEvaluator(['GENERATION_LOW', 'INVERTER_FAULT', 'GRID_EXPORT_LIMIT']) },
        { provide: BusEvaluator, useValue: emptyEvaluator(['BUS_ERROR', 'MODBUS_TIMEOUT', 'CRC_ERROR']) },
      ],
    }).compile();

    service = module.get(AlertEngineService);
  });

  const makeAlertQb = (result: unknown = null) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
    getMany: jest.fn().mockResolvedValue(result ? [result] : []),
  });

  describe('evaluateTenant', () => {
    it('returns zero counts when no active rules', async () => {
      rulesRepo.find.mockResolvedValue([]);
      const result = await service.evaluateTenant(TENANT_ID);
      expect(result).toEqual({ created: 0, autoResolved: 0 });
    });

    it('creates alert when evaluator returns violation and no existing alert', async () => {
      const rule = mockRule();
      rulesRepo.find.mockResolvedValue([rule]);

      (commEvaluator.evaluate as jest.Mock).mockResolvedValue([
        {
          targetId: 'm-1',
          buildingId: 'b-1',
          triggeredValue: 45,
          thresholdValue: 30,
          message: 'Medidor MG-001 offline 45 min',
        },
      ]);

      // No existing alert
      alertsRepo.createQueryBuilder.mockReturnValue(makeAlertQb(null));

      const result = await service.evaluateTenant(TENANT_ID);

      expect(result.created).toBe(1);
      expect(alertsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          alertRuleId: 'rule-1',
          meterId: 'm-1',
          alertTypeCode: 'METER_OFFLINE',
          severity: 'high',
          status: 'active',
        }),
      );
      expect(notificationService.notify).toHaveBeenCalled();
    });

    it('deduplicates — does not create alert when active alert exists for same rule+target', async () => {
      const rule = mockRule();
      rulesRepo.find.mockResolvedValue([rule]);

      (commEvaluator.evaluate as jest.Mock).mockResolvedValue([
        {
          targetId: 'm-1',
          buildingId: 'b-1',
          triggeredValue: 45,
          thresholdValue: 30,
          message: 'offline',
        },
      ]);

      // Existing active alert
      alertsRepo.createQueryBuilder.mockReturnValue(
        makeAlertQb({ id: 'existing-alert', status: 'active' }),
      );

      const result = await service.evaluateTenant(TENANT_ID);

      expect(result.created).toBe(0);
      expect(alertsRepo.create).not.toHaveBeenCalled();
    });

    it('auto-resolves active alerts when condition no longer met', async () => {
      const rule = mockRule();
      rulesRepo.find.mockResolvedValue([rule]);

      (commEvaluator.evaluate as jest.Mock).mockResolvedValue([]); // No violations

      const activeAlert = {
        id: 'alert-old',
        alertRuleId: 'rule-1',
        meterId: 'm-1',
        status: 'active',
      };

      // No violations → only auto-resolve query (getMany) is called
      alertsRepo.createQueryBuilder.mockReturnValue(makeAlertQb(activeAlert));

      const result = await service.evaluateTenant(TENANT_ID);

      expect(result.autoResolved).toBe(1);
      expect(alertsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          resolutionNotes: 'Auto-resuelto: condición ya no aplica',
        }),
      );
    });
  });

  describe('runEvaluation', () => {
    it('runs without error when no rules exist', async () => {
      rulesRepo.find.mockResolvedValue([]);
      await expect(service.runEvaluation()).resolves.toBeUndefined();
    });
  });
});
