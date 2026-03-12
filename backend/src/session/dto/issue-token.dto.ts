import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';

/**
 * DTO para emitir un token de sesión (consumo API sin OAuth).
 */
export class IssueTokenDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ example: 365, default: 365, minimum: 1, maximum: 3650 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  expiresInDays?: number;
}
