import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from '../platform/entities/integration.entity';
import { IntegrationSyncLog } from '../platform/entities/integration-sync-log.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { ConnectorRegistry } from './connectors/connector.registry';

@Module({
  imports: [TypeOrmModule.forFeature([Integration, IntegrationSyncLog])],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ConnectorRegistry],
  exports: [IntegrationsService, ConnectorRegistry],
})
export class IntegrationsModule {}
