import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExternalExportJobResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['csv', 'parquet'] })
  format!: string;

  @ApiProperty({ enum: ['pending', 'running', 'completed', 'failed'] })
  status!: string;

  @ApiProperty({ example: 1250 })
  rowCount!: number;

  @ApiPropertyOptional({ nullable: true })
  error!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  expiresAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Presigned S3 URL or relative download path for local dev',
    nullable: true,
  })
  downloadUrl!: string | null;
}
