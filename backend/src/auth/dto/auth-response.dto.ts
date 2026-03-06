import { ApiProperty } from '@nestjs/swagger';

class AuthUserDto {
  @ApiProperty({ example: 'b1ff57ca-1234-5678-abcd-123456789abc' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'SUPER_ADMIN', enum: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST', 'TENANT_USER', 'AUDITOR'] })
  role!: string;

  @ApiProperty({ example: 'google', enum: ['microsoft', 'google'] })
  provider!: string;

  @ApiProperty({ example: 'https://lh3.googleusercontent.com/photo.jpg', nullable: true })
  avatar!: string | null;

  @ApiProperty({ example: ['*'], type: [String] })
  siteIds!: string[];
}

export class MeResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ example: { buildings: ['read'], meters: ['read'], readings: ['read'] } })
  permissions!: Record<string, string[]>;
}

export class PermissionsResponseDto {
  @ApiProperty({ example: 'SUPER_ADMIN' })
  role!: string;

  @ApiProperty({ example: { buildings: ['read'], meters: ['read'], readings: ['read'] } })
  permissions!: Record<string, string[]>;
}
