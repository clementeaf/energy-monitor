import { IsUUID, IsOptional, IsNumber, Min } from 'class-validator';

export class AddConcentratorMeterDto {
  @IsUUID()
  meterId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  busNumber?: number;

  @IsOptional()
  @IsNumber()
  modbusAddress?: number;
}
