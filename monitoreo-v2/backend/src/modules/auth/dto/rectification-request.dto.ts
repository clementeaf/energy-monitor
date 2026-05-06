import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RectificationRequestDto {
  @IsIn(['email', 'displayName'])
  fieldName!: 'email' | 'displayName';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  requestedValue!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
