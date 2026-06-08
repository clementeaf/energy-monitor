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
import { TenantUnitsModule } from '../tenant-units/tenant-units.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { ConcentratorsModule } from '../concentrators/concentrators.module';
import { FaultEventsModule } from '../fault-events/fault-events.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { IotReadingsModule } from '../iot-readings/iot-readings.module';
import { IntegrationsModule } from '../integrations/integrations.module';

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
    TenantUnitsModule,
    HierarchyModule,
    ConcentratorsModule,
    FaultEventsModule,
    InvoicesModule,
    TariffsModule,
    IotReadingsModule,
    IntegrationsModule,
  ],
  controllers: [ExternalApiController],
})
export class ExternalApiModule {}
