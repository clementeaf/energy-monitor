import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportsService } from './reports.service';

/**
 * Runs scheduled report jobs on a fixed interval.
 */
@Injectable()
export class ReportsSchedulerService {
  private readonly logger = new Logger(ReportsSchedulerService.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'reports-scheduler' })
  async handleScheduledReports(): Promise<void> {
    try {
      const n = await this.reportsService.processDueScheduledReports();
      if (n > 0) {
        this.logger.log(`Processed ${n} scheduled report(s)`);
      }
    } catch (err) {
      this.logger.error('Scheduled reports failed', err instanceof Error ? err.stack : String(err));
    }
  }
}
