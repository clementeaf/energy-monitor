import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotReading } from './iot-reading.entity';
import { IotReadingsService } from './iot-readings.service';
import { IotReadingsController } from './iot-readings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IotReading])],
  controllers: [IotReadingsController],
  providers: [IotReadingsService],
})
export class IotReadingsModule {}
