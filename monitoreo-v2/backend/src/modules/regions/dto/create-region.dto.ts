import { IsString, MaxLength, Length } from 'class-validator';

export class CreateRegionDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @Length(2, 2)
  countryCode!: string;
}
