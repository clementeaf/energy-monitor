import { Module } from '@nestjs/common';
import { IngestDiagnosticController } from './ingest-diagnostic.controller';
import { IngestDiagnosticService } from './ingest-diagnostic.service';

@Module({
  controllers: [IngestDiagnosticController],
  providers: [IngestDiagnosticService],
})
export class IngestDiagnosticModule {}
