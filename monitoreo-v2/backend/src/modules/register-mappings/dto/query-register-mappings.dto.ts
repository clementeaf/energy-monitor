import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PROTOCOL_TYPE_CODES } from '../../../common/constants/protocol-mapping';

export class QueryRegisterMappingsDto {
  @ApiPropertyOptional({ enum: PROTOCOL_TYPE_CODES })
  @IsOptional()
  @IsIn(PROTOCOL_TYPE_CODES)
  protocol?: string;

  @ApiPropertyOptional({ example: 'pac1670' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceProfile?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter tenant scope (super_admin cross-tenant only)',
  })
  @IsOptional()
  @IsUUID('4')
  tenantId?: string;

  @ApiPropertyOptional({ description: 'When true, return only global templates' })
  @IsOptional()
  globalOnly?: string;
}
