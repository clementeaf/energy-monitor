import { Module } from '@nestjs/common';
import { ReadingsService } from './readings.service';
import { ReadingsController } from './readings.controller';
import { MeasurementsIngressService } from './measurements-ingress.service';
import { MqttReadingsIngressService } from './mqtt-readings-ingress.service';
import { BacnetReadingsIngressService } from './bacnet-readings-ingress.service';
import { CnrReadingsService } from './cnr-readings.service';
import { NormalizationService } from '../../lib/normalization.service';

@Module({
  controllers: [ReadingsController],
  providers: [
    ReadingsService,
    MeasurementsIngressService,
    MqttReadingsIngressService,
    BacnetReadingsIngressService,
    CnrReadingsService,
    NormalizationService,
  ],
  exports: [
    ReadingsService,
    MeasurementsIngressService,
    MqttReadingsIngressService,
    BacnetReadingsIngressService,
    CnrReadingsService,
    NormalizationService,
  ],
})
export class ReadingsModule {}
