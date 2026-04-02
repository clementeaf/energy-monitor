import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAlert } from '../platform/entities/platform-alert.entity';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertRulesController } from './alert-rules.controller';
import { AlertRulesService } from './alert-rules.service';
import { AlertEngineController } from './alert-engine.controller';
import { AlertEngineService } from './alert-engine.service';
import { EscalationService } from './escalation.service';
import { NotificationService } from './notification.service';
import { NotificationLogsController } from './notification-logs.controller';
import { CommunicationEvaluator } from './evaluators/communication.evaluator';
import { ElectricalEvaluator } from './evaluators/electrical.evaluator';
import { ConsumptionEvaluator } from './evaluators/consumption.evaluator';
import { OperationalEvaluator } from './evaluators/operational.evaluator';
import { GenerationEvaluator } from './evaluators/generation.evaluator';
import { BusEvaluator } from './evaluators/bus.evaluator';
import { SesEmailService } from '../../common/email/ses-email.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAlert, AlertRule, NotificationLog])],
  controllers: [
    AlertsController,
    AlertRulesController,
    AlertEngineController,
    NotificationLogsController,
  ],
  providers: [
    AlertsService,
    AlertRulesService,
    AlertEngineService,
    EscalationService,
    SesEmailService,
    NotificationService,
    CommunicationEvaluator,
    ElectricalEvaluator,
    ConsumptionEvaluator,
    OperationalEvaluator,
    GenerationEvaluator,
    BusEvaluator,
  ],
  exports: [AlertsService, AlertRulesService, AlertEngineService, NotificationService],
})
export class AlertsModule {}
