import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty()
  buildingName!: string;

  @IsNumber()
  @Min(0)
  areaSqm!: number;
}
