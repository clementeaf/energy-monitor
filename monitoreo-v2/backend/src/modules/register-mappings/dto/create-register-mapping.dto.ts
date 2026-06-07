import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PROTOCOL_TYPE_CODES,
  READING_TARGET_FIELDS,
} from '../../../common/constants/protocol-mapping';

export class CreateRegisterMappingDto {
  @ApiProperty({ enum: PROTOCOL_TYPE_CODES, example: 'modbus' })
  @IsIn(PROTOCOL_TYPE_CODES)
  protocol!: string;

  @ApiProperty({ example: 'pac1670' })
  @IsString()
  @MaxLength(100)
  deviceProfile!: string;

  @ApiProperty({ example: '40001' })
  @IsString()
  @MaxLength(100)
  registerKey!: string;

  @ApiProperty({ enum: READING_TARGET_FIELDS, example: 'power_kw' })
  @IsIn(READING_TARGET_FIELDS)
  targetField!: string;

  @ApiProperty({ example: 0.001, description: 'Multiplier applied to raw value' })
  @IsNumber()
  scaleFactor!: number;

  @ApiPropertyOptional({ example: 'kW' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Target tenant (super_admin cross-tenant only)',
  })
  @IsOptional()
  @IsUUID('4')
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Global template (super_admin only; tenant_id NULL)',
  })
  @IsOptional()
  @IsBoolean()
  isGlobalTemplate?: boolean;
}
