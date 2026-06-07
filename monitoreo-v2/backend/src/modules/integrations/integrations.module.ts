import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from '../platform/entities/integration.entity';
import { IntegrationSyncLog } from '../platform/entities/integration-sync-log.entity';
import { WebhookDeliveryLog } from '../platform/entities/webhook-delivery-log.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsHealthController } from './integrations-health.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationsHealthService } from './integrations-health.service';
import { ConnectorRegistry } from './connectors/connector.registry';
import { ReadingsModule } from '../readings/readings.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration, IntegrationSyncLog, WebhookDeliveryLog]),
    ReadingsModule,
    WebhooksModule,
  ],
  controllers: [IntegrationsController, IntegrationsHealthController],
  providers: [IntegrationsService, IntegrationsHealthService, ConnectorRegistry],
  exports: [IntegrationsService, ConnectorRegistry, IntegrationsHealthService],
})
export class IntegrationsModule {}
