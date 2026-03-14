import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingSummary } from './building-summary.entity';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingSummary])],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
