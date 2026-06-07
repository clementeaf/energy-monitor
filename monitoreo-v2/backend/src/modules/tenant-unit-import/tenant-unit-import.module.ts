import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUnitsModule } from '../tenant-units/tenant-units.module';
import { TenantUnitImportJob } from './entities/tenant-unit-import-job.entity';
import { TenantUnitImportStagingRow } from './entities/tenant-unit-import-staging-row.entity';
import { TenantUnitImportController } from './tenant-unit-import.controller';
import { TenantUnitImportParseService } from './tenant-unit-import-parse.service';
import { TenantUnitImportService } from './tenant-unit-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUnitImportJob, TenantUnitImportStagingRow]),
    TenantUnitsModule,
  ],
  controllers: [TenantUnitImportController],
  providers: [TenantUnitImportParseService, TenantUnitImportService],
  exports: [TenantUnitImportService, TenantUnitImportParseService],
})
export class TenantUnitImportModule {}
