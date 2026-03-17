import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBuildingDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  areaSqm?: number;
}
