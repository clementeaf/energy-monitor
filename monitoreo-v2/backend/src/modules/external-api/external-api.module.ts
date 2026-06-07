import { Module } from '@nestjs/common';
import { ExternalApiController } from './external-api.controller';
import { BuildingsModule } from '../buildings/buildings.module';
import { MetersModule } from '../meters/meters.module';
import { ReadingsModule } from '../readings/readings.module';
import { AlertsModule } from '../alerts/alerts.module';
import { IngestModule } from '../ingest/ingest.module';
import { TenantsModule } from '../tenants/tenants.module';
import { EtlExportModule } from '../etl-export/etl-export.module';
import { DataGovernanceModule } from '../data-governance/data-governance.module';

@Module({
  imports: [
    BuildingsModule,
    MetersModule,
    ReadingsModule,
    AlertsModule,
    IngestModule,
    TenantsModule,
    EtlExportModule,
    DataGovernanceModule,
  ],
  controllers: [ExternalApiController],
})
export class ExternalApiModule {}
