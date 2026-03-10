import { ApiProperty } from '@nestjs/swagger';

export class InvitationValidationResponseDto {
  @ApiProperty({ example: 'operator@example.com' })
  email!: string;

  @ApiProperty({ example: 'Operador Turno A' })
  name!: string;

  @ApiProperty({ example: 'OPERATOR' })
  role!: string;

  @ApiProperty({ example: 'Operador' })
  roleLabel!: string;

  @ApiProperty({ example: 'invited', enum: ['invited', 'active', 'disabled', 'expired'] })
  invitationStatus!: 'invited' | 'active' | 'disabled' | 'expired';

  @ApiProperty({ example: '2026-03-17T18:30:00.000Z', nullable: true })
  invitationExpiresAt!: string | null;
}