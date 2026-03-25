import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class OAuthLoginDto {
  @IsIn(['microsoft', 'google'])
  provider!: 'microsoft' | 'google';

  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  idToken!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  refreshToken!: string;
}
