import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeterHierarchy } from '../platform/entities/meter-hierarchy.entity';
import { MetersModule } from '../meters/meters.module';
import { MeterImportJob } from './entities/meter-import-job.entity';
import { MeterImportStagingRow } from './entities/meter-import-staging-row.entity';
import { MeterImportController } from './meter-import.controller';
import { MeterImportParseService } from './meter-import-parse.service';
import { MeterImportService } from './meter-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeterImportJob, MeterImportStagingRow, MeterHierarchy]),
    MetersModule,
  ],
  controllers: [MeterImportController],
  providers: [MeterImportParseService, MeterImportService],
  exports: [MeterImportService, MeterImportParseService],
})
export class MeterImportModule {}
