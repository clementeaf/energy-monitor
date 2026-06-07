import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReadingsExportQueryDto {
  @ApiProperty({ enum: ['csv'], example: 'csv' })
  @IsIn(['csv'])
  format!: 'csv';

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-01-31T23:59:59.999Z' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ description: 'Opaque cursor for next page (from X-Next-Cursor)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  meterId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  buildingId?: string;
}
