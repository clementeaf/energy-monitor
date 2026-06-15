import { IsOptional, IsString } from 'class-validator';

export class LatestQueryDto {
  @IsOptional()
  @IsString()
  buildingId?: string;

  @IsOptional()
  @IsString()
  meterId?: string;

  /** Comma-separated quality filter: measured,estimated,invalid,unknown */
  @IsOptional()
  @IsString()
  quality?: string;
}
