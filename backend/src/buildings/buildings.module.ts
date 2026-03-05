import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './building.entity';
import { Local } from '../locals/local.entity';
import { MonthlyConsumption } from '../locals/monthly-consumption.entity';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Building, Local, MonthlyConsumption])],
  controllers: [BuildingsController],
  providers: [BuildingsService],
})
export class BuildingsModule {}
