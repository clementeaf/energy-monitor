import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../platform/entities/report.entity';
import { ScheduledReport } from '../platform/entities/scheduled-report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsSchedulerService } from './reports-scheduler.service';
import { SesEmailService } from '../../common/email/ses-email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report, ScheduledReport])],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsSchedulerService, SesEmailService],
  exports: [ReportsService],
})
export class ReportsModule {}
