import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  storeName?: string;

  @IsNumber()
  @IsOptional()
  storeTypeId?: number;
}
