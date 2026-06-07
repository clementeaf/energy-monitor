import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataQualityDaily } from '../platform/entities/data-quality-daily.entity';
import { DataContract } from '../platform/entities/data-contract.entity';
import { DataSloBreach } from '../platform/entities/data-slo-breach.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { DataQualityAdminController } from './data-quality-admin.controller';
import { DataQualityReportService } from './data-quality-report.service';
import { DataGovernanceAdminService } from './data-governance-admin.service';
import { DataQualityRollupService } from './data-quality-rollup.service';
import { MeterBalanceJobService } from './meter-balance-job.service';
import { DataSloFreshnessService } from './data-slo-freshness.service';
import { DataContractService } from './data-contract.service';
import { DataContractGuard } from './data-contract.guard';
import { IngestModule } from '../ingest/ingest.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DataQualityDaily, DataContract, DataSloBreach, Tenant]),
    IngestModule,
  ],
  controllers: [DataQualityAdminController],
  providers: [
    DataQualityReportService,
    DataGovernanceAdminService,
    DataQualityRollupService,
    MeterBalanceJobService,
    DataSloFreshnessService,
    DataContractService,
    DataContractGuard,
  ],
  exports: [DataContractService, DataContractGuard],
})
export class DataGovernanceModule {}
