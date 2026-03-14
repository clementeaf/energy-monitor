import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RawReading } from './raw-reading.entity';
import { RawReadingsService } from './raw-readings.service';
import { RawReadingsController } from './raw-readings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RawReading])],
  controllers: [RawReadingsController],
  providers: [RawReadingsService],
  exports: [RawReadingsService],
})
export class RawReadingsModule {}
