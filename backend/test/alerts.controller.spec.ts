import { NotFoundException } from '@nestjs/common';
import { AlertsController } from '../src/alerts/alerts.controller';
import type { AuthorizationContext } from '../src/auth/auth.service';
import type { AlertsService } from '../src/alerts/alerts.service';

const authContext: AuthorizationContext = {
  userId: 'user-1',
  roleId: 4,
  role: 'OPERATOR',
  provider: 'google',
  email: 'operator@example.com',
  name: 'Operador',
  permissions: { ALERTS_OVERVIEW: ['view'], ALERT_DETAIL: ['view'] },
  siteIds: ['pac4220'],
  hasGlobalSiteAccess: false,
};

describe('AlertsController', () => {
  const alertsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    scanOfflineMeters: jest.fn(),
    acknowledge: jest.fn(),
  } as unknown as jest.Mocked<Pick<AlertsService, 'findAll' | 'findOne' | 'scanOfflineMeters' | 'acknowledge'>>;

  const controller = new AlertsController(alertsService as unknown as AlertsService);

  beforeEach(() => {
    Object.values(alertsService).forEach((fn) => fn.mockReset());
  });

  it('parses numeric limit when listing alerts', async () => {
    const result: Awaited<ReturnType<AlertsService['findAll']>> = [{
      id: 'alert-1',
      type: 'METER_OFFLINE',
      severity: 'high',
      status: 'active',
      meterId: 'M001',
      buildingId: 'pac4220',
      title: 'Medidor offline',
      message: 'Sin lecturas recientes',
      triggeredAt: new Date('2026-03-09T00:00:00Z'),
      acknowledgedAt: null,
      resolvedAt: null,
      metadata: {},
    }];
    alertsService.findAll.mockResolvedValue(result);

    await expect(controller.findAll(authContext, 'active', 'METER_OFFLINE', 'M001', 'pac4220', '25')).resolves.toEqual(result);
    expect(alertsService.findAll).toHaveBeenCalledWith(authContext, {
      status: 'active',
      type: 'METER_OFFLINE',
      meterId: 'M001',
      buildingId: 'pac4220',
      limit: 25,
    });
  });

  it('throws NotFoundException when alert detail is missing', async () => {
    alertsService.findOne.mockResolvedValue(null);

    await expect(controller.findOne('missing', authContext)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when acknowledge target is missing', async () => {
    alertsService.acknowledge.mockResolvedValue(null);

    await expect(controller.acknowledge('missing', authContext)).rejects.toBeInstanceOf(NotFoundException);
  });
});