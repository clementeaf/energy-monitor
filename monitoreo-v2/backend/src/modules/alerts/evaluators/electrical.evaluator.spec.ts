import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ElectricalEvaluator } from './electrical.evaluator';
import { AlertRule } from '../../platform/entities/alert-rule.entity';

const baseRule = (overrides: Partial<AlertRule> = {}): AlertRule => ({
  id: 'rule-1',
  tenantId: 'tenant-1',
  buildingId: null,
  alertTypeCode: 'VOLTAGE_OUT_OF_RANGE',
  name: 'Test',
  description: null,
  severity: 'high',
  isActive: true,
  checkIntervalSeconds: 300,
  config: { tolerancePct: 10 },
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

const baseReading = {
  meter_id: 'm-1',
  meter_name: 'MG-001',
  building_id: 'b-1',
  voltage_l1: '220.0',
  voltage_l2: '221.0',
  voltage_l3: '219.0',
  current_l1: '10.0',
  current_l2: '10.5',
  current_l3: '10.2',
  power_factor: '0.95',
  thd_voltage_pct: '3.5',
  thd_current_pct: '8.0',
  phase_imbalance_pct: '2.0',
  frequency_hz: '50.01',
  breaker_status: 'closed',
  nominal_voltage: '220',
  nominal_current: '15',
};

describe('ElectricalEvaluator', () => {
  let evaluator: ElectricalEvaluator;
  let dsQuery: jest.Mock;

  beforeEach(async () => {
    dsQuery = jest.fn().mockResolvedValue([baseReading]);

    const module = await Test.createTestingModule({
      providers: [
        ElectricalEvaluator,
        { provide: DataSource, useValue: { query: dsQuery } },
      ],
    }).compile();

    evaluator = module.get(ElectricalEvaluator);
  });

  it('VOLTAGE_OUT_OF_RANGE: no alert when voltage in range', async () => {
    const results = await evaluator.evaluate(baseRule(), 'tenant-1');
    expect(results).toHaveLength(0);
  });

  it('VOLTAGE_OUT_OF_RANGE: alert when voltage out of range', async () => {
    dsQuery.mockResolvedValue([{ ...baseReading, voltage_l1: '250.0' }]);
    const results = await evaluator.evaluate(baseRule(), 'tenant-1');
    expect(results).toHaveLength(1);
    expect(results[0].triggeredValue).toBe(250);
  });

  it('LOW_POWER_FACTOR: alert when PF below threshold', async () => {
    dsQuery.mockResolvedValue([{ ...baseReading, power_factor: '0.85' }]);
    const results = await evaluator.evaluate(
      baseRule({ alertTypeCode: 'LOW_POWER_FACTOR', config: { minPowerFactor: 0.92 } }),
      'tenant-1',
    );
    expect(results).toHaveLength(1);
    expect(results[0].triggeredValue).toBeCloseTo(0.85);
  });

  it('HIGH_THD: alert when THD voltage exceeds threshold', async () => {
    dsQuery.mockResolvedValue([{ ...baseReading, thd_voltage_pct: '12.0' }]);
    const results = await evaluator.evaluate(
      baseRule({ alertTypeCode: 'HIGH_THD', config: { maxThdVoltagePct: 8, maxThdCurrentPct: 20 } }),
      'tenant-1',
    );
    expect(results).toHaveLength(1);
    expect(results[0].triggeredValue).toBe(12);
  });

  it('PHASE_IMBALANCE: alert when imbalance exceeds threshold', async () => {
    dsQuery.mockResolvedValue([{ ...baseReading, phase_imbalance_pct: '8.0' }]);
    const results = await evaluator.evaluate(
      baseRule({ alertTypeCode: 'PHASE_IMBALANCE', config: { maxImbalancePct: 5 } }),
      'tenant-1',
    );
    expect(results).toHaveLength(1);
    expect(results[0].triggeredValue).toBe(8);
  });

  it('BREAKER_TRIP: alert when breaker is open', async () => {
    dsQuery.mockResolvedValue([{ ...baseReading, breaker_status: 'open' }]);
    const results = await evaluator.evaluate(
      baseRule({ alertTypeCode: 'BREAKER_TRIP', config: {} }),
      'tenant-1',
    );
    expect(results).toHaveLength(1);
  });

  it('FREQUENCY_OUT_OF_RANGE: no alert when in range', async () => {
    const results = await evaluator.evaluate(
      baseRule({ alertTypeCode: 'FREQUENCY_OUT_OF_RANGE', config: { minHz: 49.5, maxHz: 50.5 } }),
      'tenant-1',
    );
    expect(results).toHaveLength(0);
  });

  it('OVERCURRENT: alert when current exceeds nominal + tolerance', async () => {
    dsQuery.mockResolvedValue([{ ...baseReading, current_l1: '20.0', nominal_current: '15' }]);
    const results = await evaluator.evaluate(
      baseRule({ alertTypeCode: 'OVERCURRENT', config: { tolerancePct: 20 } }),
      'tenant-1',
    );
    expect(results).toHaveLength(1);
    expect(results[0].triggeredValue).toBe(20);
  });
});
