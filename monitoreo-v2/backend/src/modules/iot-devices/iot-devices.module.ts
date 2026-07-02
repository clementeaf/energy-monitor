import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotDevice } from '../platform/entities/iot-device.entity';
import { Meter } from '../platform/entities/meter.entity';
import { IotDevicesService } from './iot-devices.service';
import { IotDevicesController } from './iot-devices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IotDevice, Meter])],
  controllers: [IotDevicesController],
  providers: [IotDevicesService],
  exports: [IotDevicesService],
})
export class IotDevicesModule {}
