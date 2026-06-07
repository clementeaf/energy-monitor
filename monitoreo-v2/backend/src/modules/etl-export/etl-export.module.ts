import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { EtlWatermarksService } from './etl-watermarks.service';
import { ReadingsExportService } from './readings-export.service';
import { ExportStorageService } from './export-storage.service';
import { DataExportJobsService } from './data-export-jobs.service';

@Module({
  imports: [PlatformModule],
  providers: [
    EtlWatermarksService,
    ReadingsExportService,
    ExportStorageService,
    DataExportJobsService,
  ],
  exports: [
    EtlWatermarksService,
    ReadingsExportService,
    ExportStorageService,
    DataExportJobsService,
  ],
})
export class EtlExportModule {}
