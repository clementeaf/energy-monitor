import { IsInt, IsDateString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVarElectricDto {
  @IsInt()
  idvar_electric!: number;

  @IsInt()
  estado!: number;

  @IsInt()
  id_remarcador!: number;

  @IsDateString()
  fecha!: string;

  @IsOptional() @IsNumber() @Type(() => Number) tag1?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag2?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag3?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag4?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag5?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag6?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag7?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag8?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag9?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag10?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag11?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag12?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag13?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag14?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag15?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag16?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag17?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag18?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag19?: number | null;
  @IsOptional() @IsNumber() @Type(() => Number) tag20?: number | null;
}

export class CreateVarElectricBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVarElectricDto)
  records!: CreateVarElectricDto[];
}
