import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeterReadingStatus } from '../platform/entities/meter-reading-status.entity';
import { IngestGap } from '../platform/entities/ingest-gap.entity';
import { BackfillJob } from '../platform/entities/backfill-job.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { MeterReadingStatusService } from './meter-reading-status.service';
import { IngestGapDetectorService } from './ingest-gap-detector.service';
import { BackfillJobsService } from './backfill-jobs.service';
import { BackfillJobsController } from './backfill-jobs.controller';
import { IngestGapsAdminController } from './ingest-gaps-admin.controller';
import { IngestGapsAdminService } from './ingest-gaps-admin.service';
import { BACKFILL_WORKER, NoOpBackfillWorker } from './backfill.worker';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeterReadingStatus, IngestGap, BackfillJob, Tenant]),
    WebhooksModule,
  ],
  controllers: [BackfillJobsController, IngestGapsAdminController],
  providers: [
    MeterReadingStatusService,
    IngestGapDetectorService,
    IngestGapsAdminService,
    BackfillJobsService,
    { provide: BACKFILL_WORKER, useClass: NoOpBackfillWorker },
  ],
  exports: [MeterReadingStatusService, BackfillJobsService],
})
export class IngestModule {}
