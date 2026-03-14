import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeterMonthly } from './meter-monthly.entity';
import { MeterMonthlyService } from './meter-monthly.service';
import { MeterMonthlyController } from './meter-monthly.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MeterMonthly])],
  controllers: [MeterMonthlyController],
  providers: [MeterMonthlyService],
  exports: [MeterMonthlyService],
})
export class MeterMonthlyModule {}
