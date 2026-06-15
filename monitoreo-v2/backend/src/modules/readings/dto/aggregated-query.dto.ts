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

  @IsOptional()
  @IsIn(['generation', 'load'])
  meterRole?: string;

  /** Comma-separated quality filter: measured,estimated,invalid,unknown */
  @IsOptional()
  @IsString()
  quality?: string;

  /** Filter by meter load category (e.g., clima, iluminacion, fuerza) */
  @IsOptional()
  @IsString()
  loadCategory?: string;
}
