import { IsString, IsOptional, IsISO8601, IsIn } from 'class-validator';

export class AggregatedQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;

  @IsIn(['15min', 'hourly', 'daily', 'monthly'])
  interval!: string;

  @IsOptional()
  @IsString()
  buildingId?: string;

  @IsOptional()
  @IsString()
  meterId?: string;

  @IsOptional()
  @IsIn(['portfolio', 'building'])
  groupBy?: string;
}
