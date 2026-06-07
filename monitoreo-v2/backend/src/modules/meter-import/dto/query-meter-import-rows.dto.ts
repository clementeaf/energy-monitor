import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMeterImportRowsDto {
  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ enum: ['valid', 'error', 'duplicate', 'created'] })
  @IsOptional()
  @IsIn(['valid', 'error', 'duplicate', 'created'])
  status?: 'valid' | 'error' | 'duplicate' | 'created';
}
