import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsObject,
  MaxLength,
} from 'class-validator';

export class UpdateHierarchyNodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
