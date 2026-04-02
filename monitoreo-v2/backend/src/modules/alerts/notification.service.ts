import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PlatformAlert, PlatformAlertSeverity } from '../platform/entities/platform-alert.entity';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { SesEmailService } from '../../common/email/ses-email.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    private readonly config: ConfigService,
    private readonly sesEmail: SesEmailService,
  ) {}

  /**
   * Send notifications for a newly created alert based on rule channel config.
   */
  async notify(alert: PlatformAlert, rule: AlertRule): Promise<void> {
    if (rule.notifyEmail) {
      await this.sendEmail(alert, rule);
    }
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
    const body = [
      `Alerta: ${alert.alertTypeCode}`,
      `Escalación: ${prevSeverity} → ${newSeverity}`,
      `Mensaje: ${alert.message}`,
      alert.triggeredValue !== null ? `Valor: ${alert.triggeredValue}` : null,
      alert.thresholdValue !== null ? `Umbral: ${alert.thresholdValue}` : null,
      `Fecha: ${alert.createdAt.toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.deliverAlertEmail(alert, subject, body);
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

    await this.deliverAlertEmail(alert, subject, body);
  }

  /**
   * Sends alert email via SES when `SES_FROM_EMAIL` and `ALERT_EMAIL_RECIPIENTS` are set; otherwise logs only.
   */
  private async deliverAlertEmail(
    alert: PlatformAlert,
    subject: string,
    body: string,
  ): Promise<void> {
    const recipients = this.alertEmailRecipients();
    const from = this.sesEmail.getFromAddress();

    if (!from || recipients.length === 0) {
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
      return;
    }

    const result = await this.sesEmail.sendPlainText({
      to: recipients,
      subject,
      body,
    });

    if (result.ok) {
      this.logger.log(
        `[EMAIL] sent MessageId=${result.messageId} to=${recipients.join(', ')}`,
      );
      await this.logNotification({
        tenantId: alert.tenantId,
        alertId: alert.id,
        channel: 'email',
        status: 'sent',
        recipient: recipients.join(', '),
        subject,
        body,
      });
      return;
    }

    if (result.skippedReason) {
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
      return;
    }

    this.logger.error(`[EMAIL] SES error: ${result.errorMessage}`);
    await this.logNotification({
      tenantId: alert.tenantId,
      alertId: alert.id,
      channel: 'email',
      status: 'failed',
      recipient: recipients.join(', '),
      subject,
      body,
      errorMessage: result.errorMessage ?? 'Unknown SES error',
    });
  }

  /**
   * @returns Destinatarios operativos para alertas (coma-separados en env)
   */
  private alertEmailRecipients(): string[] {
    const raw = this.config.get<string>('ALERT_EMAIL_RECIPIENTS') ?? '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
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
   * Registra alta de usuario (invitación implícita). Envía correo vía SES si `SES_FROM_EMAIL` está definido.
   * @param params - Datos del usuario recién creado en admin
   */
  async notifyUserCreated(params: {
    tenantId: string;
    email: string;
    displayName: string | null;
    authProvider: 'microsoft' | 'google';
  }): Promise<void> {
    const subject = 'Alta de usuario en la plataforma de monitoreo';
    const body = [
      `Se registró un usuario en el tenant.`,
      `Email: ${params.email}`,
      params.displayName ? `Nombre: ${params.displayName}` : null,
      `Proveedor de acceso: ${params.authProvider}`,
      'Inicie sesión con ese proveedor usando la cuenta indicada.',
    ]
      .filter(Boolean)
      .join('\n');

    this.logger.log(`[USER_INVITE] tenant=${params.tenantId}\n${body}`);

    if (!this.sesEmail.getFromAddress()) {
      return;
    }

    const result = await this.sesEmail.sendPlainText({
      to: [params.email],
      subject,
      body,
    });

    if (result.ok) {
      this.logger.log(
        `[USER_INVITE] SES sent MessageId=${result.messageId} to=${params.email}`,
      );
      return;
    }

    if (result.skippedReason === 'no_recipients') {
      this.logger.warn(`[USER_INVITE] SES skipped: no recipient for ${params.email}`);
      return;
    }

    if (result.errorMessage) {
      this.logger.error(`[USER_INVITE] SES failed: ${result.errorMessage}`);
    }
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
