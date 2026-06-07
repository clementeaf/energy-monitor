import { IsOptional, IsEnum, IsString } from 'class-validator';

export class AlertQueryDto {
  @IsOptional()
  @IsEnum(['active', 'acknowledged', 'resolved'])
  status?: string;

  @IsOptional()
  @IsEnum(['critical', 'high', 'medium', 'low'])
  severity?: string;

  @IsOptional()
  @IsString()
  buildingId?: string;

  @IsOptional()
  @IsString()
  meterId?: string;
}
