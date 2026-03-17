import { Type } from 'class-transformer';
import { IsArray, ArrayMinSize, ValidateNested, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class BulkStoreItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  meterId!: string;

  @IsString()
  @IsNotEmpty()
  storeName!: string;

  @IsString()
  @IsNotEmpty()
  storeTypeName!: string;

  @IsString()
  @IsNotEmpty()
  buildingName!: string;
}

export class BulkCreateStoresDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkStoreItemDto)
  items!: BulkStoreItemDto[];
}
