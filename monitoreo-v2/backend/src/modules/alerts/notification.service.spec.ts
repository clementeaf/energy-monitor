import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationLog } from './entities/notification-log.entity';
import { PlatformAlert } from '../platform/entities/platform-alert.entity';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { SesEmailService } from '../../common/email/ses-email.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let logRepo: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;
  let sesEmail: { getFromAddress: jest.Mock; sendPlainText: jest.Mock };

  beforeEach(async () => {
    logRepo = {
      create: jest.fn((data) => ({ id: 'log-1', ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      createQueryBuilder: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    sesEmail = {
      getFromAddress: jest.fn().mockReturnValue(null),
      sendPlainText: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(NotificationLog), useValue: logRepo },
        { provide: ConfigService, useValue: configService },
        { provide: SesEmailService, useValue: sesEmail },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  const mockAlert: PlatformAlert = {
    id: 'alert-1',
    tenantId: 'tenant-1',
    alertRuleId: 'rule-1',
    alertRule: null,
    buildingId: 'b-1',
    meterId: 'm-1',
    alertTypeCode: 'METER_OFFLINE',
    severity: 'high',
    status: 'active',
    message: 'Medidor offline',
    triggeredValue: 45,
    thresholdValue: 30,
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
  };

  const mockRule: AlertRule = {
    id: 'rule-1',
    tenantId: 'tenant-1',
    buildingId: null,
    alertTypeCode: 'METER_OFFLINE',
    name: 'Test',
    description: null,
    severity: 'high',
    isActive: true,
    checkIntervalSeconds: 300,
    config: {},
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
  };

  it('logs email notification when rule has notifyEmail', async () => {
    await service.notify(mockAlert, mockRule);

    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        status: 'sent',
        tenantId: 'tenant-1',
        alertId: 'alert-1',
      }),
    );
    expect(logRepo.save).toHaveBeenCalled();
    expect(sesEmail.sendPlainText).not.toHaveBeenCalled();
  });

  it('sends alert email via SES when From and ALERT_EMAIL_RECIPIENTS are set', async () => {
    sesEmail.getFromAddress.mockReturnValue('ops@verified.example.com');
    configService.get.mockImplementation((key: string) => {
      if (key === 'ALERT_EMAIL_RECIPIENTS') return 'oncall@example.com, other@example.com';
      return undefined;
    });
    sesEmail.sendPlainText.mockResolvedValue({ ok: true, messageId: 'msg-123' });

    await service.notify(mockAlert, mockRule);

    expect(sesEmail.sendPlainText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['oncall@example.com', 'other@example.com'],
        subject: expect.stringContaining('METER_OFFLINE'),
      }),
    );
    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        status: 'sent',
        recipient: 'oncall@example.com, other@example.com',
      }),
    );
  });

  it('does not send webhook when ALERT_WEBHOOK_URL not configured', async () => {
    await service.notify(mockAlert, { ...mockRule, notifyEmail: false });
    // Only webhook would be called, but no URL → no log
    // The email log is skipped, webhook returns early → only the webhook check happens
    expect(logRepo.create).not.toHaveBeenCalled();
  });

  it('logs escalation notification', async () => {
    await service.notifyEscalation(mockAlert, 'medium', 'high');

    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        subject: expect.stringContaining('ESCALADA'),
      }),
    );
  });

  describe('findLogs', () => {
    it('queries logs with filters', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
        getMany: jest.fn().mockResolvedValue([]),
      };
      logRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findLogs('tenant-1', {
        channel: 'email',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({ data: [], total: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith('n.channel = :channel', { channel: 'email' });
    });
  });
});
