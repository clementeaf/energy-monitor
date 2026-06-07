import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExportJobDto {
  @ApiProperty({ enum: ['csv', 'parquet'], example: 'parquet' })
  @IsIn(['csv', 'parquet'])
  format!: 'csv' | 'parquet';

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-01-31T23:59:59.999Z' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  meterId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  buildingId?: string;
}
