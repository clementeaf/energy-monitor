import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { DriveIngestDiagnosticResponseDto } from './dto/drive-ingest-diagnostic-response.dto';
import type { DriveIngestDiagnosticResult } from './ingest-diagnostic.service';
import { IngestDiagnosticService } from './ingest-diagnostic.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('ingest')
export class IngestDiagnosticController {
  constructor(private readonly ingestDiagnosticService: IngestDiagnosticService) {}

  @Get('diagnostic')
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({
    summary: 'Diagnóstico Drive → RDS',
    description:
      'Compara datos en readings_import_staging (origen Google Drive) con la tabla readings (consumida por el backend). ' +
      'Informa si la data servida por el backend corresponde en totalidad a lo obtenido de Google Drive. ' +
      'Conclusión: full_match (100% en readings), partial_match (falta parte), mismatch (ninguna fila coincide), no_staging_data (sin datos Drive).',
  })
  @ApiOkResponse({
    description: 'Informe de diagnóstico: staging vs readings',
    type: DriveIngestDiagnosticResponseDto,
  })
  async getDriveIngestDiagnostic(): Promise<DriveIngestDiagnosticResult> {
    return this.ingestDiagnosticService.runDiagnostic();
  }

  @Get('diagnostic/local')
  @Public()
  @ApiOperation({
    summary: 'Diagnóstico Drive → RDS (solo desarrollo)',
    description: 'Mismo payload que GET /ingest/diagnostic pero sin auth. Solo cuando NODE_ENV !== production.',
  })
  @ApiOkResponse({ description: 'Informe de diagnóstico staging vs readings' })
  async getDriveIngestDiagnosticLocal(): Promise<DriveIngestDiagnosticResult | { error: string }> {
    if (process.env.NODE_ENV === 'production') {
      return { error: 'No disponible en producción' };
    }
    return this.ingestDiagnosticService.runDiagnostic();
  }
}
