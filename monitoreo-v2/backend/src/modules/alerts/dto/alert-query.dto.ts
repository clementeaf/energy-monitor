import { IsOptional, IsEnum, IsUUID } from 'class-validator';

export class AlertQueryDto {
  @IsOptional()
  @IsEnum(['active', 'acknowledged', 'resolved'])
  status?: string;

  @IsOptional()
  @IsEnum(['critical', 'high', 'medium', 'low'])
  severity?: string;

  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @IsOptional()
  @IsUUID()
  meterId?: string;
}
