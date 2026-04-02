import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { PlatformAlert } from '../platform/entities/platform-alert.entity';
import { AlertEvaluator, EvaluationResult } from './evaluators/evaluator.interface';
import { CommunicationEvaluator } from './evaluators/communication.evaluator';
import { ElectricalEvaluator } from './evaluators/electrical.evaluator';
import { ConsumptionEvaluator } from './evaluators/consumption.evaluator';
import { OperationalEvaluator } from './evaluators/operational.evaluator';
import { GenerationEvaluator } from './evaluators/generation.evaluator';
import { BusEvaluator } from './evaluators/bus.evaluator';
import { NotificationService } from './notification.service';

@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);
  private readonly evaluatorMap: Map<string, AlertEvaluator>;

  constructor(
    @InjectRepository(AlertRule)
    private readonly rulesRepo: Repository<AlertRule>,
    @InjectRepository(PlatformAlert)
    private readonly alertsRepo: Repository<PlatformAlert>,
    private readonly ds: DataSource,
    private readonly notificationService: NotificationService,
    communicationEval: CommunicationEvaluator,
    electricalEval: ElectricalEvaluator,
    consumptionEval: ConsumptionEvaluator,
    operationalEval: OperationalEvaluator,
    generationEval: GenerationEvaluator,
    busEval: BusEvaluator,
  ) {
    this.evaluatorMap = new Map();
    const evaluators: AlertEvaluator[] = [
      communicationEval,
      electricalEval,
      consumptionEval,
      operationalEval,
      generationEval,
      busEval,
    ];
    for (const ev of evaluators) {
      for (const code of ev.supportedCodes) {
        this.evaluatorMap.set(code, ev);
      }
    }
  }

  /**
   * Main evaluation cron — runs every 5 minutes.
   * Loads active rules, evaluates each, creates/dedup alerts, auto-resolves.
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'alert-engine' })
  async runEvaluation(): Promise<void> {
    this.logger.log('Alert engine: starting evaluation cycle');

    const rules = await this.rulesRepo.find({ where: { isActive: true } });
    this.logger.log(`Found ${rules.length} active rules`);

    let created = 0;
    let autoResolved = 0;

    // Group rules by tenant for auto-resolve
    const rulesByTenant = new Map<string, AlertRule[]>();
    for (const rule of rules) {
      const arr = rulesByTenant.get(rule.tenantId) ?? [];
      arr.push(rule);
      rulesByTenant.set(rule.tenantId, arr);
    }

    for (const rule of rules) {
      try {
        const evaluator = this.evaluatorMap.get(rule.alertTypeCode);
        if (!evaluator) {
          this.logger.warn(`No evaluator for ${rule.alertTypeCode}`);
          continue;
        }

        const results = await evaluator.evaluate(rule, rule.tenantId);

        for (const result of results) {
          const wasCreated = await this.createAlertIfNew(rule, result);
          if (wasCreated) created++;
        }

        // Auto-resolve alerts for this rule where condition no longer holds
        const resolved = await this.autoResolve(rule, results);
        autoResolved += resolved;
      } catch (err) {
        this.logger.error(
          `Error evaluating rule ${rule.id} (${rule.alertTypeCode}): ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Alert engine: cycle complete — ${created} created, ${autoResolved} auto-resolved`,
    );
  }

  /**
   * Create alert only if no active/acknowledged alert exists for same rule+target.
   */
  private async createAlertIfNew(
    rule: AlertRule,
    result: EvaluationResult,
  ): Promise<boolean> {
    // Dedup: check for existing active alert on same rule + target
    const existing = await this.alertsRepo
      .createQueryBuilder('a')
      .where('a.alert_rule_id = :ruleId', { ruleId: rule.id })
      .andWhere('a.meter_id = :targetId', { targetId: result.targetId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: ['active', 'acknowledged'],
      })
      .getOne();

    if (existing) return false;

    const alert = this.alertsRepo.create({
      tenantId: rule.tenantId,
      alertRuleId: rule.id,
      buildingId: result.buildingId,
      meterId: result.targetId,
      alertTypeCode: rule.alertTypeCode,
      severity: rule.severity,
      status: 'active',
      message: result.message,
      triggeredValue: result.triggeredValue,
      thresholdValue: result.thresholdValue,
    });

    const saved = await this.alertsRepo.save(alert);

    // Send notification
    await this.notificationService.notify(saved, rule);

    return true;
  }

  /**
   * Auto-resolve alerts whose condition is no longer met.
   * Only auto-resolves alerts that are still 'active' (not acknowledged — manual ack means manual resolve).
   */
  private async autoResolve(
    rule: AlertRule,
    currentResults: EvaluationResult[],
  ): Promise<number> {
    const violatingTargetIds = new Set(currentResults.map((r) => r.targetId));

    const activeAlerts = await this.alertsRepo
      .createQueryBuilder('a')
      .where('a.alert_rule_id = :ruleId', { ruleId: rule.id })
      .andWhere('a.status = :status', { status: 'active' })
      .getMany();

    let resolved = 0;
    for (const alert of activeAlerts) {
      if (alert.meterId && !violatingTargetIds.has(alert.meterId)) {
        alert.status = 'resolved';
        alert.resolvedAt = new Date();
        alert.resolutionNotes = 'Auto-resuelto: condición ya no aplica';
        await this.alertsRepo.save(alert);
        resolved++;
      }
    }

    return resolved;
  }

  /**
   * Manual trigger for testing — evaluate all rules for a tenant.
   */
  async evaluateTenant(tenantId: string): Promise<{ created: number; autoResolved: number }> {
    const rules = await this.rulesRepo.find({
      where: { tenantId, isActive: true },
    });

    let created = 0;
    let autoResolved = 0;

    for (const rule of rules) {
      const evaluator = this.evaluatorMap.get(rule.alertTypeCode);
      if (!evaluator) continue;

      const results = await evaluator.evaluate(rule, tenantId);

      for (const result of results) {
        const wasCreated = await this.createAlertIfNew(rule, result);
        if (wasCreated) created++;
      }

      const resolved = await this.autoResolve(rule, results);
      autoResolved += resolved;
    }

    return { created, autoResolved };
  }
}
