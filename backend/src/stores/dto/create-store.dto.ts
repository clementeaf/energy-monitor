import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  meterId!: string;

  @IsString()
  @IsNotEmpty()
  storeName!: string;

  @IsNumber()
  storeTypeId!: number;

  @IsString()
  @IsNotEmpty()
  buildingName!: string;
}
