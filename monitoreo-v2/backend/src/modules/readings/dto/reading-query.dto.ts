import { IsUUID, IsOptional, IsISO8601, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ReadingQueryDto {
  @IsUUID()
  meterId!: string;

  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;

  @IsOptional()
  @IsIn(['raw', '5min', '15min', '1h', '1d'])
  resolution?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number;
}
