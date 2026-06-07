import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingsModule } from '../buildings/buildings.module';
import { BuildingImportJob } from './entities/building-import-job.entity';
import { BuildingImportStagingRow } from './entities/building-import-staging-row.entity';
import { BuildingImportController } from './building-import.controller';
import { BuildingImportParseService } from './building-import-parse.service';
import { BuildingImportService } from './building-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BuildingImportJob, BuildingImportStagingRow]),
    BuildingsModule,
  ],
  controllers: [BuildingImportController],
  providers: [BuildingImportParseService, BuildingImportService],
  exports: [BuildingImportService, BuildingImportParseService],
})
export class BuildingImportModule {}
