import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotReading } from './entities/iot-reading.entity';
import { IotReadingsController } from './iot-readings.controller';
import { IotReadingsService } from './iot-readings.service';
import { NormalizationService } from '../../lib/normalization.service';

@Module({
  imports: [TypeOrmModule.forFeature([IotReading])],
  controllers: [IotReadingsController],
  providers: [IotReadingsService, NormalizationService],
  exports: [IotReadingsService],
})
export class IotReadingsModule {}
