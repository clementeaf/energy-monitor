import { IsString, IsOptional, IsUUID, IsEmail, IsIn, MaxLength } from 'class-validator';

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
}
