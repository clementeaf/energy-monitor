import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PlatformAlert, PlatformAlertSeverity } from '../platform/entities/platform-alert.entity';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { NotificationLog } from './entities/notification-log.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Send notifications for a newly created alert based on rule channel config.
   */
  async notify(alert: PlatformAlert, rule: AlertRule): Promise<void> {
    if (rule.notifyEmail) {
      await this.sendEmail(alert, rule);
    }
    // Webhook: always notify (system integration)
    await this.sendWebhook(alert, 'new_alert');
  }

  /**
   * Send notifications for an escalated alert.
   */
  async notifyEscalation(
    alert: PlatformAlert,
    prevSeverity: PlatformAlertSeverity,
    newSeverity: PlatformAlertSeverity,
  ): Promise<void> {
    const subject = `[ESCALADA] Alerta ${alert.alertTypeCode} — ${prevSeverity} → ${newSeverity}`;

    await this.logNotification({
      tenantId: alert.tenantId,
      alertId: alert.id,
      channel: 'email',
      status: 'sent',
      recipient: null,
      subject,
      body: alert.message,
    });

    await this.sendWebhook(alert, 'escalation');
  }

  private async sendEmail(alert: PlatformAlert, rule: AlertRule): Promise<void> {
    const severityLabel: Record<string, string> = {
      critical: 'CRITICA',
      high: 'ALTA',
      medium: 'MEDIA',
      low: 'BAJA',
    };

    const subject = `[${severityLabel[alert.severity] ?? alert.severity}] ${alert.alertTypeCode}`;
    const body = [
      `Alerta: ${alert.alertTypeCode}`,
      `Severidad: ${alert.severity}`,
      `Mensaje: ${alert.message}`,
      alert.triggeredValue !== null ? `Valor: ${alert.triggeredValue}` : null,
      alert.thresholdValue !== null ? `Umbral: ${alert.thresholdValue}` : null,
      `Fecha: ${alert.createdAt.toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    // TODO: integrate AWS SES when out of sandbox
    // For now, log the notification
    this.logger.log(`[EMAIL] ${subject}\n${body}`);

    await this.logNotification({
      tenantId: alert.tenantId,
      alertId: alert.id,
      channel: 'email',
      status: 'sent',
      recipient: null,
      subject,
      body,
    });
  }

  private async sendWebhook(
    alert: PlatformAlert,
    event: 'new_alert' | 'escalation',
  ): Promise<void> {
    const webhookUrl = this.config.get<string>('ALERT_WEBHOOK_URL');
    if (!webhookUrl) return;

    const payload = {
      event,
      alert: {
        id: alert.id,
        alertTypeCode: alert.alertTypeCode,
        severity: alert.severity,
        status: alert.status,
        message: alert.message,
        triggeredValue: alert.triggeredValue,
        thresholdValue: alert.thresholdValue,
        buildingId: alert.buildingId,
        meterId: alert.meterId,
        createdAt: alert.createdAt,
      },
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      await this.logNotification({
        tenantId: alert.tenantId,
        alertId: alert.id,
        channel: 'webhook',
        status: response.ok ? 'sent' : 'failed',
        recipient: webhookUrl,
        subject: event,
        body: JSON.stringify(payload),
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
      });
    } catch (err) {
      this.logger.error(`Webhook failed: ${(err as Error).message}`);
      await this.logNotification({
        tenantId: alert.tenantId,
        alertId: alert.id,
        channel: 'webhook',
        status: 'failed',
        recipient: webhookUrl,
        subject: event,
        body: JSON.stringify(payload),
        errorMessage: (err as Error).message,
      });
    }
  }

  private async logNotification(data: {
    tenantId: string;
    alertId: string;
    channel: NotificationLog['channel'];
    status: NotificationLog['status'];
    recipient: string | null;
    subject: string;
    body: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    const log = this.logRepo.create({
      tenantId: data.tenantId,
      alertId: data.alertId,
      channel: data.channel,
      status: data.status,
      recipient: data.recipient,
      subject: data.subject,
      body: data.body,
      errorMessage: data.errorMessage ?? null,
    });
    await this.logRepo.save(log);
  }

  /**
   * Query notification logs for frontend display.
   */
  async findLogs(
    tenantId: string,
    filters: {
      alertId?: string;
      channel?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ data: NotificationLog[]; total: number }> {
    const qb = this.logRepo
      .createQueryBuilder('n')
      .where('n.tenant_id = :tenantId', { tenantId })
      .orderBy('n.created_at', 'DESC');

    if (filters.alertId) {
      qb.andWhere('n.alert_id = :alertId', { alertId: filters.alertId });
    }
    if (filters.channel) {
      qb.andWhere('n.channel = :channel', { channel: filters.channel });
    }
    if (filters.status) {
      qb.andWhere('n.status = :status', { status: filters.status });
    }

    const total = await qb.getCount();
    const data = await qb
      .skip(filters.offset ?? 0)
      .take(filters.limit ?? 50)
      .getMany();

    return { data, total };
  }
}
