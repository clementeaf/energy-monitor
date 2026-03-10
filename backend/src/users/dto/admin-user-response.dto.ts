import { ApiProperty } from '@nestjs/swagger';

export class AdminUserResponseDto {
  @ApiProperty({ example: 'b1ff57ca-1234-5678-abcd-123456789abc' })
  id!: string;

  @ApiProperty({ example: 'operator@example.com' })
  email!: string;

  @ApiProperty({ example: 'Operador Turno A' })
  name!: string;

  @ApiProperty({ example: 4 })
  roleId!: number;

  @ApiProperty({ example: 'OPERATOR' })
  role!: string;

  @ApiProperty({ example: 'Operador' })
  roleLabel!: string;

  @ApiProperty({ example: 'google', enum: ['microsoft', 'google'], nullable: true })
  provider!: 'microsoft' | 'google' | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: ['pac4220'], type: [String] })
  siteIds!: string[];

  @ApiProperty({ example: 'invited', enum: ['invited', 'active', 'disabled', 'expired'] })
  invitationStatus!: 'invited' | 'active' | 'disabled' | 'expired';

  @ApiProperty({ example: '2026-03-17T18:30:00.000Z', nullable: true })
  invitationExpiresAt!: string | null;

  @ApiProperty({ example: '2026-03-10T18:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-10T18:30:00.000Z' })
  updatedAt!: string;
}