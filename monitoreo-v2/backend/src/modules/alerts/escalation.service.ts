import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformAlert, PlatformAlertSeverity } from '../platform/entities/platform-alert.entity';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { NotificationService } from './notification.service';

const SEVERITY_ORDER: PlatformAlertSeverity[] = ['low', 'medium', 'high', 'critical'];

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    @InjectRepository(PlatformAlert)
    private readonly alertsRepo: Repository<PlatformAlert>,
    @InjectRepository(AlertRule)
    private readonly rulesRepo: Repository<AlertRule>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Escalation cron — runs every 15 minutes.
   * Checks active/acknowledged alerts against their rule's escalation levels.
   * L1: time since created > escalationL1Minutes → bump to next severity
   * L2: time > escalationL2Minutes → bump again
   * L3: time > escalationL3Minutes → bump to critical
   */
  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'alert-escalation' })
  async runEscalation(): Promise<void> {
    this.logger.log('Escalation: starting cycle');

    const openAlerts = await this.alertsRepo
      .createQueryBuilder('a')
      .where('a.status IN (:...statuses)', {
        statuses: ['active', 'acknowledged'],
      })
      .andWhere('a.alert_rule_id IS NOT NULL')
      .getMany();

    if (openAlerts.length === 0) {
      this.logger.log('Escalation: no open alerts');
      return;
    }

    // Batch-load rules
    const ruleIds = [...new Set(openAlerts.map((a) => a.alertRuleId!))];
    const rules = await this.rulesRepo.findByIds(ruleIds);
    const ruleMap = new Map(rules.map((r) => [r.id, r]));

    let escalated = 0;

    for (const alert of openAlerts) {
      const rule = ruleMap.get(alert.alertRuleId!);
      if (!rule) continue;

      const minutesOpen = (Date.now() - alert.createdAt.getTime()) / 60_000;
      const currentIdx = SEVERITY_ORDER.indexOf(alert.severity);
      let targetSeverity = alert.severity;

      if (rule.escalationL3Minutes > 0 && minutesOpen >= rule.escalationL3Minutes) {
        targetSeverity = 'critical';
      } else if (rule.escalationL2Minutes > 0 && minutesOpen >= rule.escalationL2Minutes) {
        const nextIdx = Math.min(currentIdx + 2, SEVERITY_ORDER.length - 1);
        targetSeverity = SEVERITY_ORDER[nextIdx];
      } else if (rule.escalationL1Minutes > 0 && minutesOpen >= rule.escalationL1Minutes) {
        const nextIdx = Math.min(currentIdx + 1, SEVERITY_ORDER.length - 1);
        targetSeverity = SEVERITY_ORDER[nextIdx];
      }

      if (targetSeverity !== alert.severity) {
        const prevSeverity = alert.severity;
        alert.severity = targetSeverity;
        await this.alertsRepo.save(alert);
        escalated++;

        this.logger.log(
          `Escalated alert ${alert.id}: ${prevSeverity} → ${targetSeverity} (${Math.round(minutesOpen)} min open)`,
        );

        await this.notificationService.notifyEscalation(alert, prevSeverity, targetSeverity);
      }
    }

    this.logger.log(`Escalation: cycle complete — ${escalated} alerts escalated`);
  }
}
