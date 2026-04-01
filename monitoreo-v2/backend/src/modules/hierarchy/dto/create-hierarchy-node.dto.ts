import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsNumber,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateHierarchyNodeDto {
  @IsUUID()
  buildingId!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsIn(['floor', 'zone', 'panel', 'circuit', 'sub_circuit'])
  levelType!: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
