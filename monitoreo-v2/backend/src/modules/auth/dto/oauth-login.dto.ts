import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class OAuthLoginDto {
  @IsIn(['microsoft', 'google'])
  provider!: 'microsoft' | 'google';

  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  idToken!: string;
}

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  refreshToken?: string;
}
