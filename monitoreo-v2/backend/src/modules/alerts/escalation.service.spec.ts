import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EscalationService } from './escalation.service';
import { PlatformAlert } from '../platform/entities/platform-alert.entity';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { NotificationService } from './notification.service';

describe('EscalationService', () => {
  let service: EscalationService;
  let alertsRepo: Record<string, jest.Mock>;
  let rulesRepo: Record<string, jest.Mock>;
  let notificationService: Record<string, jest.Mock>;

  beforeEach(async () => {
    alertsRepo = {
      createQueryBuilder: jest.fn(),
      save: jest.fn((a) => Promise.resolve(a)),
    };

    rulesRepo = {
      findByIds: jest.fn().mockResolvedValue([]),
    };

    notificationService = {
      notify: jest.fn(),
      notifyEscalation: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        EscalationService,
        { provide: getRepositoryToken(PlatformAlert), useValue: alertsRepo },
        { provide: getRepositoryToken(AlertRule), useValue: rulesRepo },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(EscalationService);
  });

  const makeQb = (alerts: unknown[]) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(alerts),
  });

  it('does nothing when no open alerts', async () => {
    alertsRepo.createQueryBuilder.mockReturnValue(makeQb([]));
    await service.runEscalation();
    expect(alertsRepo.save).not.toHaveBeenCalled();
  });

  it('escalates alert severity when L1 threshold exceeded', async () => {
    const now = Date.now();
    const alert = {
      id: 'a-1',
      alertRuleId: 'rule-1',
      severity: 'medium',
      status: 'active',
      createdAt: new Date(now - 45 * 60_000), // 45 min ago
    };

    alertsRepo.createQueryBuilder.mockReturnValue(makeQb([alert]));
    rulesRepo.findByIds.mockResolvedValue([
      {
        id: 'rule-1',
        escalationL1Minutes: 30,
        escalationL2Minutes: 120,
        escalationL3Minutes: 1440,
      },
    ]);

    await service.runEscalation();

    expect(alertsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'high' }),
    );
    expect(notificationService.notifyEscalation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a-1' }),
      'medium',
      'high',
    );
  });

  it('escalates to critical when L3 threshold exceeded', async () => {
    const now = Date.now();
    const alert = {
      id: 'a-2',
      alertRuleId: 'rule-1',
      severity: 'medium',
      status: 'active',
      createdAt: new Date(now - 1500 * 60_000), // 1500 min ago
    };

    alertsRepo.createQueryBuilder.mockReturnValue(makeQb([alert]));
    rulesRepo.findByIds.mockResolvedValue([
      {
        id: 'rule-1',
        escalationL1Minutes: 30,
        escalationL2Minutes: 120,
        escalationL3Minutes: 1440,
      },
    ]);

    await service.runEscalation();

    expect(alertsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical' }),
    );
  });

  it('does not escalate when no threshold exceeded', async () => {
    const now = Date.now();
    const alert = {
      id: 'a-3',
      alertRuleId: 'rule-1',
      severity: 'medium',
      status: 'active',
      createdAt: new Date(now - 5 * 60_000), // 5 min ago
    };

    alertsRepo.createQueryBuilder.mockReturnValue(makeQb([alert]));
    rulesRepo.findByIds.mockResolvedValue([
      {
        id: 'rule-1',
        escalationL1Minutes: 30,
        escalationL2Minutes: 120,
        escalationL3Minutes: 1440,
      },
    ]);

    await service.runEscalation();

    expect(alertsRepo.save).not.toHaveBeenCalled();
  });
});
