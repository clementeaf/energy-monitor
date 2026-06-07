import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookSubscription } from '../platform/entities/webhook-subscription.entity';
import { WebhookDeliveryLog } from '../platform/entities/webhook-delivery-log.entity';
import { WebhookSubscriptionsController } from './webhook-subscriptions.controller';
import { WebhookDeliveryLogsController } from './webhook-delivery-logs.controller';
import { WebhookSubscriptionsService } from './webhook-subscriptions.service';
import { WebhookDeliveryLogsService } from './webhook-delivery-logs.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookSubscription, WebhookDeliveryLog])],
  controllers: [WebhookSubscriptionsController, WebhookDeliveryLogsController],
  providers: [WebhookSubscriptionsService, WebhookDeliveryLogsService, WebhookDispatcherService],
  exports: [WebhookSubscriptionsService, WebhookDispatcherService],
})
export class WebhooksModule {}
