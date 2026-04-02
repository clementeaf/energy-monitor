import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../platform/entities/report.entity';
import { ScheduledReport } from '../platform/entities/scheduled-report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsSchedulerService } from './reports-scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report, ScheduledReport])],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsSchedulerService],
  exports: [ReportsService],
})
export class ReportsModule {}
