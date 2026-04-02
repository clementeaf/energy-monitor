import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CommunicationEvaluator } from './communication.evaluator';
import { AlertRule } from '../../platform/entities/alert-rule.entity';

const mockRule = (overrides: Partial<AlertRule> = {}): AlertRule => ({
  id: 'rule-1',
  tenantId: 'tenant-1',
  buildingId: null,
  alertTypeCode: 'METER_OFFLINE',
  name: 'Test',
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

describe('CommunicationEvaluator', () => {
  let evaluator: CommunicationEvaluator;
  let dsQuery: jest.Mock;

  beforeEach(async () => {
    dsQuery = jest.fn().mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        CommunicationEvaluator,
        { provide: DataSource, useValue: { query: dsQuery } },
      ],
    }).compile();

    evaluator = module.get(CommunicationEvaluator);
  });

  it('supports METER_OFFLINE, CONCENTRATOR_OFFLINE, COMM_DEGRADED', () => {
    expect(evaluator.supportedCodes).toEqual([
      'METER_OFFLINE',
      'CONCENTRATOR_OFFLINE',
      'COMM_DEGRADED',
    ]);
  });

  describe('METER_OFFLINE', () => {
    it('returns results for offline meters', async () => {
      dsQuery.mockResolvedValue([
        { id: 'm-1', name: 'MG-001', building_id: 'b-1', minutes_since: 45 },
      ]);

      const results = await evaluator.evaluate(mockRule(), 'tenant-1');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(
        expect.objectContaining({
          targetId: 'm-1',
          buildingId: 'b-1',
          triggeredValue: 45,
          thresholdValue: 30,
        }),
      );
    });

    it('returns empty when all meters online', async () => {
      dsQuery.mockResolvedValue([]);
      const results = await evaluator.evaluate(mockRule(), 'tenant-1');
      expect(results).toHaveLength(0);
    });

    it('scopes by buildingId when rule has building', async () => {
      dsQuery.mockResolvedValue([]);
      await evaluator.evaluate(
        mockRule({ buildingId: 'b-1' }),
        'tenant-1',
      );

      const [, params] = dsQuery.mock.calls[0];
      expect(params).toContain('b-1');
    });
  });

  describe('CONCENTRATOR_OFFLINE', () => {
    it('returns results for offline concentrators', async () => {
      dsQuery.mockResolvedValue([
        { id: 'c-1', name: 'Conc-001', building_id: 'b-1', minutes_since: 20 },
      ]);

      const results = await evaluator.evaluate(
        mockRule({ alertTypeCode: 'CONCENTRATOR_OFFLINE', config: { offlineMinutes: 15 } }),
        'tenant-1',
      );

      expect(results).toHaveLength(1);
      expect(results[0].thresholdValue).toBe(15);
    });
  });

  describe('COMM_DEGRADED', () => {
    it('returns results for meters with low reading count', async () => {
      dsQuery.mockResolvedValue([
        { id: 'm-2', name: 'MG-002', building_id: 'b-1', reading_count: 2 },
      ]);

      const results = await evaluator.evaluate(
        mockRule({
          alertTypeCode: 'COMM_DEGRADED',
          config: { minReadingsPctPerHour: 80, expectedReadingsPerHour: 4 },
        }),
        'tenant-1',
      );

      expect(results).toHaveLength(1);
      expect(results[0].triggeredValue).toBe(50); // 2/4 * 100
    });
  });
});
