import { IsOptional, IsString, MaxLength, Length } from 'class-validator';

export class UpdateRegionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;
}
