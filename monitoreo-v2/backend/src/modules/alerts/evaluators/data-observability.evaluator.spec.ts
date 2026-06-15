import { DataSource } from 'typeorm';
import { DataObservabilityEvaluator } from './data-observability.evaluator';
import { TREND_BREAK, NULL_SPIKE, VOLUME_ANOMALY } from '../alert-type-codes';
import { AlertRule } from '../../platform/entities/alert-rule.entity';

function makeRule(overrides: Partial<AlertRule>): AlertRule {
  return {
    id: 'rule-1',
    tenantId: 't-1',
    buildingId: null,
    alertTypeCode: TREND_BREAK,
    severity: 'medium',
    isActive: true,
    config: {},
    ...overrides,
  } as AlertRule;
}

describe('DataObservabilityEvaluator (DAT-27)', () => {
  let evaluator: DataObservabilityEvaluator;
  let ds: { query: jest.Mock };

  beforeEach(() => {
    ds = { query: jest.fn().mockResolvedValue([]) };
    evaluator = new DataObservabilityEvaluator(ds as unknown as DataSource);
  });

  describe('supportedCodes', () => {
    it('handles TREND_BREAK, NULL_SPIKE, VOLUME_ANOMALY', () => {
      expect(evaluator.supportedCodes).toEqual([TREND_BREAK, NULL_SPIKE, VOLUME_ANOMALY]);
    });
  });

  describe('TREND_BREAK', () => {
    it('returns results when deviation exceeds threshold', async () => {
      ds.query.mockResolvedValueOnce([
        {
          meter_id: 'm-1',
          meter_name: 'Main',
          building_id: 'b-1',
          recent_avg: 150,
          baseline_avg: 100,
        },
      ]);

      const results = await evaluator.evaluate(
        makeRule({ alertTypeCode: TREND_BREAK, config: { deviationPct: 40 } }),
        't-1',
      );

      expect(results).toHaveLength(1);
      expect(results[0].targetId).toBe('m-1');
      expect(results[0].triggeredValue).toBe(150);
      expect(results[0].thresholdValue).toBe(100);
      expect(results[0].message).toContain('quiebre de tendencia');
    });

    it('returns empty when no deviation', async () => {
      ds.query.mockResolvedValueOnce([]);

      const results = await evaluator.evaluate(
        makeRule({ alertTypeCode: TREND_BREAK }),
        't-1',
      );

      expect(results).toHaveLength(0);
    });

    it('applies building filter when set', async () => {
      ds.query.mockResolvedValueOnce([]);

      await evaluator.evaluate(
        makeRule({ alertTypeCode: TREND_BREAK, buildingId: 'b-99' }),
        't-1',
      );

      const sql = ds.query.mock.calls[0][0];
      expect(sql).toContain('m.building_id = $2');
      expect(ds.query.mock.calls[0][1]).toContain('b-99');
    });
  });

  describe('NULL_SPIKE', () => {
    it('returns results when null percentage exceeds threshold', async () => {
      ds.query.mockResolvedValueOnce([
        {
          meter_id: 'm-2',
          meter_name: 'Sub-1',
          building_id: 'b-1',
          total_count: 24,
          null_count: 8,
          null_pct: 33.3,
        },
      ]);

      const results = await evaluator.evaluate(
        makeRule({ alertTypeCode: NULL_SPIKE, config: { nullPct: 20 } }),
        't-1',
      );

      expect(results).toHaveLength(1);
      expect(results[0].triggeredValue).toBe(33.3);
      expect(results[0].message).toContain('lecturas nulas');
    });
  });

  describe('VOLUME_ANOMALY', () => {
    it('returns results when volume deviates from baseline', async () => {
      ds.query.mockResolvedValueOnce([
        {
          meter_id: 'm-3',
          meter_name: 'HVAC',
          building_id: 'b-2',
          current_count: 10,
          baseline_count: 24,
        },
      ]);

      const results = await evaluator.evaluate(
        makeRule({ alertTypeCode: VOLUME_ANOMALY, config: { deviationPct: 50 } }),
        't-1',
      );

      expect(results).toHaveLength(1);
      expect(results[0].triggeredValue).toBe(10);
      expect(results[0].thresholdValue).toBe(24);
      expect(results[0].message).toContain('volumen lecturas');
    });
  });

  describe('unknown code', () => {
    it('returns empty array', async () => {
      const results = await evaluator.evaluate(
        makeRule({ alertTypeCode: 'UNKNOWN_CODE' }),
        't-1',
      );

      expect(results).toHaveLength(0);
      expect(ds.query).not.toHaveBeenCalled();
    });
  });
});
