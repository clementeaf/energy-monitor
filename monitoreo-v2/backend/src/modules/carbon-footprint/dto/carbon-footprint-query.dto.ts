import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CarbonFootprintQueryDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  to!: string;
}

export class CarbonFootprintMonthlyQueryDto extends CarbonFootprintQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buildingId?: string;
}
