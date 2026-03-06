import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './alert.entity';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { Meter } from '../meters/meter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alert, Meter])],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
