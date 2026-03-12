import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsDateString, MinLength } from 'class-validator';

/**
 * DTO para crear una sesión (token de consumo API).
 */
export class CreateSessionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'sha256-hash-del-token', minLength: 16 })
  @IsString()
  @MinLength(16)
  tokenHash!: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  expiresAt!: string;
}
