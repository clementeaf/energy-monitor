import { IsUUID, IsOptional } from 'class-validator';

export class LatestQueryDto {
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @IsOptional()
  @IsUUID()
  meterId?: string;
}
