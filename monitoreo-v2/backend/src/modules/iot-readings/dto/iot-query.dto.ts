import { IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class IotTimeSeriesDto {
  @IsUUID()
  meterId!: string;

  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;

  @IsOptional()
  @IsString({ each: true })
  variables?: string;

  @IsOptional()
  @IsIn(['raw', 'hour', 'day'])
  resolution?: string;
}

export class IotLatestDto {
  @IsOptional()
  @IsUUID()
  meterId?: string;

  @IsOptional()
  @IsUUID()
  buildingId?: string;
}

export class IotReadingsQueryDto {
  @IsUUID()
  meterId!: string;

  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}

export class IotAlertsDto {
  @IsOptional()
  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  severity?: string;

  @IsOptional()
  @IsUUID()
  meterId?: string;
}
