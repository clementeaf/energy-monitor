import { Module } from '@nestjs/common';
import { ExternalApiController } from './external-api.controller';
import { BuildingsModule } from '../buildings/buildings.module';
import { MetersModule } from '../meters/meters.module';
import { ReadingsModule } from '../readings/readings.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [BuildingsModule, MetersModule, ReadingsModule, AlertsModule],
  controllers: [ExternalApiController],
})
export class ExternalApiModule {}
