import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportsService } from './reports.service';
import { SesEmailService } from '../../common/email/ses-email.service';

@Injectable()
export class ReportsSchedulerService {
  private readonly logger = new Logger(ReportsSchedulerService.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly sesEmailService: SesEmailService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'reports-scheduler' })
  async handleScheduledReports(): Promise<void> {
    try {
      const results = await this.reportsService.processDueScheduledReports();
      for (const result of results) {
        if (result.recipients.length === 0) continue;

        try {
          await this.sesEmailService.sendWithAttachment({
            to: result.recipients,
            subject: `Reporte ${result.report.reportType} — ${result.report.periodStart}`,
            body: `Adjunto el reporte programado de ${result.report.reportType} (período ${result.report.periodStart}).`,
            attachment: {
              filename: result.filename,
              content: result.buffer,
              contentType: result.mime,
            },
          });
        } catch (err) {
          this.logger.error(
            `Failed to email report ${result.report.id}`,
            err instanceof Error ? err.stack : String(err),
          );
        }
      }

      if (results.length > 0) {
        this.logger.log(`Processed ${results.length} scheduled report(s)`);
      }
    } catch (err) {
      this.logger.error('Scheduled reports failed', err instanceof Error ? err.stack : String(err));
    }
  }
}
