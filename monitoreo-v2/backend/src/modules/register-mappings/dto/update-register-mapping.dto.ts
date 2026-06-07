import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PROTOCOL_TYPE_CODES,
  READING_TARGET_FIELDS,
} from '../../../common/constants/protocol-mapping';

export class UpdateRegisterMappingDto {
  @ApiPropertyOptional({ enum: PROTOCOL_TYPE_CODES })
  @IsOptional()
  @IsIn(PROTOCOL_TYPE_CODES)
  protocol?: string;

  @ApiPropertyOptional({ example: 'pac1670' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceProfile?: string;

  @ApiPropertyOptional({ example: '40001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registerKey?: string;

  @ApiPropertyOptional({ enum: READING_TARGET_FIELDS })
  @IsOptional()
  @IsIn(READING_TARGET_FIELDS)
  targetField?: string;

  @ApiPropertyOptional({ example: 0.001 })
  @IsOptional()
  @IsNumber()
  scaleFactor?: number;

  @ApiPropertyOptional({ example: 'kW' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string | null;
}
