import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryReportsDto {
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  reportType?: string;
}

export class QueryScheduledReportsDto {
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}
