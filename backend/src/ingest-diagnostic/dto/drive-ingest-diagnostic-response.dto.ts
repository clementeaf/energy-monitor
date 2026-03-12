import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DriveIngestFileSummaryDto {
  @ApiProperty({ example: 'MALL_GRANDE_446_completo.csv', description: 'Nombre del archivo fuente en S3/Drive' })
  sourceFile!: string;

  @ApiProperty({ example: 35040, description: 'Filas en staging para este archivo' })
  rowCount!: number;

  @ApiProperty({ example: 10, description: 'Medidores distintos en este archivo' })
  meterCount!: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', description: 'Primera marca temporal' })
  minTimestamp!: string;

  @ApiProperty({ example: '2026-12-31T23:45:00.000Z', description: 'Última marca temporal' })
  maxTimestamp!: string;
}

export class DriveIngestFileMatchDto {
  @ApiProperty({ example: 'MALL_GRANDE_446_completo.csv' })
  sourceFile!: string;

  @ApiProperty({ example: 35040, description: 'Filas en staging para este archivo' })
  stagingRows!: number;

  @ApiProperty({ example: 35040, description: 'Filas que tienen correspondencia en readings' })
  matchedInReadings!: number;

  @ApiProperty({ example: 0, description: 'Filas de staging sin correspondencia en readings' })
  missingInReadings!: number;

  @ApiProperty({ example: 100, description: 'Porcentaje de coincidencia (0-100)' })
  matchPercent!: number;
}

export class DriveIngestDiagnosticResponseDto {
  @ApiProperty({ example: true, description: 'Si la tabla readings_import_staging existe' })
  hasStagingTable!: boolean;

  @ApiProperty({ example: 150000, description: 'Total de filas en staging (origen Drive)' })
  stagingTotalRows!: number;

  @ApiProperty({ type: [DriveIngestFileSummaryDto], description: 'Resumen por archivo fuente' })
  stagingFiles!: DriveIngestFileSummaryDto[];

  @ApiProperty({ type: [String], example: ['MG-001', 'MM-045'], description: 'meter_id presentes en staging' })
  stagingMeterIds!: string[];

  @ApiProperty({ example: 150000, description: 'Filas de staging que tienen match en readings' })
  readingsMatchedCount!: number;

  @ApiProperty({
    example: 150000,
    description: 'Total de filas en readings para los meter_id de staging (incluye datos preexistentes o sintéticos)',
  })
  readingsTotalForStagingMeters!: number;

  @ApiProperty({ type: [DriveIngestFileMatchDto], description: 'Coincidencia por archivo' })
  perFileMatch!: DriveIngestFileMatchDto[];

  @ApiProperty({
    enum: ['full_match', 'partial_match', 'mismatch', 'no_staging_data'],
    description: 'full_match: 100% en readings; partial_match: parte falta; mismatch: ninguna; no_staging_data: sin datos Drive',
  })
  conclusion!: 'full_match' | 'partial_match' | 'mismatch' | 'no_staging_data';

  @ApiProperty({ example: 'El 100% de los datos obtenidos de Google Drive está presente en readings.' })
  message!: string;

  @ApiProperty({ example: '2026-03-12T14:30:00.000Z', description: 'Fecha/hora de generación del informe' })
  generatedAt!: string;
}
