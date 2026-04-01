import { IsString, IsNumber, IsOptional, MaxLength, Min, Max } from 'class-validator';

export class CreateTariffBlockDto {
  @IsString()
  @MaxLength(50)
  blockName!: string;

  @IsNumber()
  @Min(0)
  @Max(23)
  hourStart!: number;

  @IsNumber()
  @Min(0)
  @Max(23)
  hourEnd!: number;

  @IsNumber()
  energyRate!: number;

  @IsOptional()
  @IsNumber()
  demandRate?: number;

  @IsOptional()
  @IsNumber()
  reactiveRate?: number;

  @IsOptional()
  @IsNumber()
  fixedCharge?: number;
}
