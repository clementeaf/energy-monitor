import { IsString, IsOptional, IsUUID, IsEmail, IsIn, IsBoolean, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsIn(['microsoft', 'google'])
  authProvider!: 'microsoft' | 'google';

  @IsString()
  @MaxLength(255)
  authProviderId!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID(undefined, { each: true })
  buildingIds?: string[];

  /** Ley 21.719 Art. 16 quater: admin must confirm user is 14+ */
  @IsBoolean()
  ageVerified!: boolean;
}
