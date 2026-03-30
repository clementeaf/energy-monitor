import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAlert } from '../platform/entities/platform-alert.entity';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertRulesController } from './alert-rules.controller';
import { AlertRulesService } from './alert-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAlert, AlertRule])],
  controllers: [AlertsController, AlertRulesController],
  providers: [AlertsService, AlertRulesService],
  exports: [AlertsService, AlertRulesService],
})
export class AlertsModule {}
