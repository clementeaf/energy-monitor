import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './entities/building.entity';
import { Region } from './entities/region.entity';
import { Meter } from './entities/meter.entity';
import { BuildingHierarchy } from './entities/building-hierarchy.entity';
import { MeterHierarchy } from './entities/meter-hierarchy.entity';
import { Concentrator } from './entities/concentrator.entity';
import { ConcentratorMeter } from './entities/concentrator-meter.entity';
import { FaultEvent } from './entities/fault-event.entity';
import { Tariff } from './entities/tariff.entity';
import { TariffBlock } from './entities/tariff-block.entity';
import { TenantUnit } from './entities/tenant-unit.entity';
import { TenantUnitMeter } from './entities/tenant-unit-meter.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLineItem } from './entities/invoice-line-item.entity';
import { AlertRule } from './entities/alert-rule.entity';
import { PlatformAlert } from './entities/platform-alert.entity';
import { Report } from './entities/report.entity';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { Integration } from './entities/integration.entity';
import { IntegrationSyncLog } from './entities/integration-sync-log.entity';
import { MeterReadingStatus } from './entities/meter-reading-status.entity';
import { IngestGap } from './entities/ingest-gap.entity';
import { BackfillJob } from './entities/backfill-job.entity';
import { EtlWatermark } from './entities/etl-watermark.entity';
import { DataExportJob } from './entities/data-export-job.entity';
import { ProtocolType } from './entities/protocol-type.entity';
import { RegisterMapping } from './entities/register-mapping.entity';

const platformEntities = [
  Building,
  Region,
  Meter,
  BuildingHierarchy,
  MeterHierarchy,
  Concentrator,
  ConcentratorMeter,
  FaultEvent,
  Tariff,
  TariffBlock,
  TenantUnit,
  TenantUnitMeter,
  Invoice,
  InvoiceLineItem,
  AlertRule,
  PlatformAlert,
  Report,
  ScheduledReport,
  Integration,
  IntegrationSyncLog,
  MeterReadingStatus,
  IngestGap,
  BackfillJob,
  EtlWatermark,
  DataExportJob,
  ProtocolType,
  RegisterMapping,
];

@Module({
  imports: [TypeOrmModule.forFeature(platformEntities)],
  exports: [TypeOrmModule],
})
export class PlatformModule {}
