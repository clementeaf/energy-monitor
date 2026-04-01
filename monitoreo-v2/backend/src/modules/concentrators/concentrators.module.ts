import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Concentrator } from '../platform/entities/concentrator.entity';
import { ConcentratorMeter } from '../platform/entities/concentrator-meter.entity';
import { ConcentratorsController } from './concentrators.controller';
import { ConcentratorsService } from './concentrators.service';

@Module({
  imports: [TypeOrmModule.forFeature([Concentrator, ConcentratorMeter])],
  controllers: [ConcentratorsController],
  providers: [ConcentratorsService],
  exports: [ConcentratorsService],
})
export class ConcentratorsModule {}
