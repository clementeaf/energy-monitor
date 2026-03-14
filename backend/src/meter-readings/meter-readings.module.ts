import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeterReading } from './meter-reading.entity';
import { MeterReadingsService } from './meter-readings.service';
import { MeterReadingsController } from './meter-readings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MeterReading])],
  controllers: [MeterReadingsController],
  providers: [MeterReadingsService],
  exports: [MeterReadingsService],
})
export class MeterReadingsModule {}
