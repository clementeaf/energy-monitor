import { IsUUID, IsOptional, IsISO8601, IsIn } from 'class-validator';

export class AggregatedQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;

  @IsIn(['hourly', 'daily', 'monthly'])
  interval!: string;

  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @IsOptional()
  @IsUUID()
  meterId?: string;
}
