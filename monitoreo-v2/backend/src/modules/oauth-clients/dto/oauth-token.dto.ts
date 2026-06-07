import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class OAuthTokenDto {
  @IsString()
  @IsIn(['client_credentials'])
  grant_type!: 'client_credentials';

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  client_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  client_secret!: string;
}
