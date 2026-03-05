import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Local } from './local.entity';
import { MonthlyConsumption } from './monthly-consumption.entity';
import { LocalsService } from './locals.service';
import { LocalsController } from './locals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Local, MonthlyConsumption])],
  controllers: [LocalsController],
  providers: [LocalsService],
})
export class LocalsModule {}
