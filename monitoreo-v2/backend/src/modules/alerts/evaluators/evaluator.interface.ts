import { AlertRule } from '../../platform/entities/alert-rule.entity';

/** Result of evaluating one rule against one meter/concentrator */
export interface EvaluationResult {
  /** The meter or concentrator that triggered */
  targetId: string;
  /** The building this target belongs to */
  buildingId: string;
  /** The value that triggered (for display) */
  triggeredValue: number;
  /** The threshold that was violated */
  thresholdValue: number;
  /** Human-readable message */
  message: string;
}

/** Every evaluator implements this interface */
export interface AlertEvaluator {
  /** Which alert_type_codes this evaluator handles */
  readonly supportedCodes: string[];

  /**
   * Evaluate a rule and return results for all violating meters/concentrators.
   * Returns empty array if no violation.
   */
  evaluate(
    rule: AlertRule,
    tenantId: string,
  ): Promise<EvaluationResult[]>;
}
