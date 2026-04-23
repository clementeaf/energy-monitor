import { IsOptional, IsString } from 'class-validator';

export class LatestQueryDto {
  @IsOptional()
  @IsString()
  buildingId?: string;

  @IsOptional()
  @IsString()
  meterId?: string;
}
